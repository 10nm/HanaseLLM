from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import time
import tempfile

app = Flask(__name__)

model = WhisperModel("small", device="cuda", compute_type="float32")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    audio_data = audio_file.read()

    with tempfile.NamedTemporaryFile(delete=False) as temp_audio_file:
        temp_audio_file.write(audio_data)
        temp_audio_file_path = temp_audio_file.name

    segments, info = model.transcribe(temp_audio_file_path, language="ja", vad_filter=True, without_timestamps=True)
    transcription = "".join([segment.text for segment in segments])
    return jsonify({"text": transcription})

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000)