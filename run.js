const { exec, spawn } = require("child_process");

function runDiscordBot() {
    const discordBotExecutable = "node";
    const args = ["index.js"];
    const process = spawn(discordBotExecutable, args);

    process.stdout.on("data", (data)=>{
        console.log(`D:${data}`);
    });
    process.stderr.on("data", (data)=>{
        console.error(`Discord-stderr:${data}`);
    });
    process.on("error", (err) => {
        console.error(`Discord-err: ${err}`);
    })
}

function runllamagui() {
    const serverExecutable = "./wsl.sh";
    const args = ["--api", "--api-port", "5001"];
    const options = { cwd: "../../text-generation-webui" };
    const process = spawn(serverExecutable, args, options);

    process.stdout.on("data", (data)=>{
        console.log(`L:${data}`);
    });
    process.stderr.on("data", (data)=>{
        console.error(`Llama-stderr:${data}`);
    });
    process.on("error", (err) => {
        console.error(`Llama-err: ${err}`);
    })
    runDiscordBot();
}

function runPythonScript(){
        const pythonExecutable = "../venv/bin/python3";
        const scriptPath = "faster.py";
        const process = spawn(pythonExecutable, [scriptPath]);

        process.stdout.on("data", (data) => {
            console.log(`W:${data}`);
        });

        process.stderr.on("data", (data) => {
            console.error(`Whisper-stderr: ${data}`);
        });

        process.on("close", (code) => {
            console.log(`child process exited with code ${code}`);
        });
        runllamagui();
}

function runDockerContainer(){
    exec("sudo docker run -d --name voicevox_engine_container -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest", (error, stdout, stderr) => {
        if (error) {
            if (stderr.includes("Conflict")){
                console.log("Container already running");
                exec("sudo docker rm -f voicevox_engine_container", (rmError, rmStdout, rmStderr) => {
                    if (rmError) {
                        console.error(`exec error: ${rmError}`);
                        return;
                    } 
                    if (rmStderr) {
                        console.error(`stderr: ${rmStderr}`);
                    }
                    console.log(`R:${rmStdout}`);
                    runDockerContainer();
                });
            } else {
                console.error(`exec error: ${error}`);
            }
            return;
        }
        console.log(`V: \n ${stdout}`);
        runPythonScript();
    });
}

runDockerContainer();