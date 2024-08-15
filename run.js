const { exec, spawn } = require("child_process");

const defaultModel = "Llama-3-ELYZA-JP-8B-q4_k_m.gguf?download=true";
let llamaProcess = null;


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

function runllama(model) {
    const serverExecutable = "./wsl.sh";
    const args = ["--api", "--api-port", "5001", "--model", model];
    const options = { cwd: "../../text-generation-webui" };
    const llamaProcess = spawn(serverExecutable, args, options);

    llamaProcess.stdout.on("data", (data)=>{
        console.log(`L:${data}`);
    });
    llamaProcess.stderr.on("data", (data)=>{
        console.error(`Llama-stderr:${data}`);
    });
    llamaProcess.on("error", (err) => {
        console.error(`Llama-err: ${err}`);
    })
    // runDiscordBot();
}

function stopllama(){
    if (llamaProcess){
        llamaProcess.kill();
        llamaProcess = null;
    } else {
        console.log("No Llama process is running");
    }
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
        // runllama();
}

function runDockerContainer(){
    exec("sudo docker run --name voicevox_gpu --detach --gpus all -p '127.0.0.1:50021:50021' voicevox/voicevox_engine:nvidia-ubuntu20.04-latest ", (error, stdout, stderr) => {
        if (error) {
            if (stderr.includes("Conflict")){
                console.log("Container already running");
                exec("sudo docker rm -f voicevox_gpu", (rmError, rmStdout, rmStderr) => {
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
        // runPythonScript();
    });
}


module.exports = { runllama, stopllama };

function runALL(){
    runDockerContainer();
    runPythonScript();
    runllama(defaultModel);
    runDiscordBot();
}

runALL();
// runDockerContainer();