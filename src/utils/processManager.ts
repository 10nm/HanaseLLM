import { spawn, execSync, type ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * ローカルLLM APIサーバーのプロセスマネージャー
 */
export class LocalLLMProcessManager {
  private process: ChildProcess | null = null;
  private readonly scriptPath: string;
  private readonly apiUrl: string;
  private readonly projectRoot: string;

  constructor(scriptPath: string, apiUrl: string) {
    this.scriptPath = resolve(scriptPath);
    this.apiUrl = apiUrl;
    // スクリプトのパスからプロジェクトルートを推定（src/utils/processManager.ts -> src/utils -> src -> root という仮定ではなく、
    // 実行時のカレントディレクトリを基準にするのが安全だが、ここではscriptPathがプロジェクト内にあると仮定して
    // scriptPathのディレクトリの親の親...と辿るよりは、process.cwd()を使うのが一般的
    this.projectRoot = process.cwd();
  }

  /**
   * APIサーバーを起動
   */
  async start(): Promise<void> {
    if (this.process) {
      console.log('Local LLM API server is already running');
      return;
    }

    console.log(`Starting local LLM API server...`);

    // venvのセットアップ
    const venvPath = join(this.projectRoot, '.venv');
    const pythonPath = join(venvPath, 'bin', 'python');
    const pipPath = join(venvPath, 'bin', 'pip');

    if (!existsSync(venvPath)) {
      console.log('Creating virtual environment (.venv)...');
      try {
        execSync('python3 -m venv .venv', { cwd: this.projectRoot, stdio: 'inherit' });
      } catch (error) {
        throw new Error(`Failed to create venv: ${error}`);
      }
    }

    // 依存関係のインストール（簡易チェック: pip listで確認する代わりに、毎回インストールコマンドを走らせる（既に入っていれば早いはず））
    // ただし、起動のたびに走ると遅いので、venv作成時または明示的なフラグがある時だけにしたいが、
    // 要件は「必要パッケージはあらかじめインストールしてください」なので、
    // ここではvenvが存在しても念のためインストールコマンドを走らせるか、あるいはマーカーファイルを確認するか。
    // ユーザー体験を損なわない範囲で、インストールを試みる。
    console.log('Ensuring dependencies are installed...');
    try {
      execSync(`${pipPath} install torch transformers peft fastapi uvicorn`, {
        cwd: this.projectRoot,
        stdio: 'inherit',
      });
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error}`);
    }

    console.log(`Launching LLM API server from: ${this.scriptPath}`);

    return new Promise((resolve, reject) => {
      // venvのPythonを使ってスクリプトを起動
      this.process = spawn(pythonPath, [this.scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        cwd: this.projectRoot, // カレントディレクトリをプロジェクトルートに設定
      });

      if (!this.process.stdout || !this.process.stderr) {
        reject(new Error('Failed to create process streams'));
        return;
      }

      let isResolved = false;

      const checkStartupMessage = (output: string) => {
        if (output.includes('Starting API server') || output.includes('Uvicorn running')) {
          if (!isResolved) {
            isResolved = true;
            // サーバーが完全に起動するまで少し待機
            setTimeout(() => {
              this.waitForServer()
                .then(() => resolve())
                .catch(reject);
            }, 2000);
          }
        }
      };

      // 標準出力をログに出力
      this.process.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[Local LLM] ${output.trim()}`);
        checkStartupMessage(output);
      });

      // 標準エラー出力をログに出力
      this.process.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        console.error(`[Local LLM Error] ${output.trim()}`);
        checkStartupMessage(output);
      });

      // プロセス終了時の処理
      this.process.on('exit', (code, signal) => {
        console.log(`Local LLM API server exited with code ${code}, signal ${signal}`);
        this.process = null;

        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Process exited prematurely with code ${code}`));
        }
      });

      // エラー処理
      this.process.on('error', (error) => {
        console.error('Failed to start local LLM API server:', error);
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      });

      // タイムアウト処理（120秒）
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Local LLM API server startup timeout'));
        }
      }, 120000);
    });
  }

  /**
   * サーバーが起動するまで待機
   */
  private async waitForServer(maxRetries = 30, interval = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${this.apiUrl}/docs`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          console.log('Local LLM API server is ready');
          return;
        }
      } catch (error) {
        // サーバーがまだ起動していない場合はエラーを無視
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
    }

    throw new Error('Local LLM API server failed to become ready');
  }

  /**
   * サーバーが起動中かチェック
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * APIサーバーを停止
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log('Stopping local LLM API server...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.once('exit', () => {
        console.log('Local LLM API server stopped');
        this.process = null;
        resolve();
      });

      // SIGTERMを送信
      this.process.kill('SIGTERM');

      // 5秒後に強制終了
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing local LLM API server...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }
}
