from flask import Flask, request, send_file
import cv2
import tempfile
import os

from testLandmark import landmarks_video

app = Flask(__name__)

@app.route('/process-video', methods=['POST'])
def process_video():
    file = request.files['video']
    
    # Save input temporarily
    input_path = tempfile.mktemp(suffix='.mp4')
    output_path = tempfile.mktemp(suffix='.mp4')
    file.save(input_path)
    landmarks_video.process(input_path, output_path)

    return send_file(output_path, mimetype='video/mp4')

if __name__ == '__main__':
    app.run(debug=True)
