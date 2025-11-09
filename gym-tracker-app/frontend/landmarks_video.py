from flask import Flask, request, send_file, jsonify
import tempfile
import os
from landmarks_video import process

app = Flask(__name__)

@app.route('/process-video', methods=['POST'])
def process_video():
  if 'video' not in request.files:
    return jsonify({'error': 'No video file provided'}), 400
  
  file = request.files['video']
  if file.filename == '':
    return jsonify({'error': 'No file selected'}), 400
  
  input_path = None
  output_path = None
  
  try:
    # Create temp files with proper extensions
    input_fd, input_path = tempfile.mkstemp(suffix='.mp4')
    os.close(input_fd)
    
    output_fd, output_path = tempfile.mkstemp(suffix='.mp4')
    os.close(output_fd)
    
    # Save uploaded file
    file.save(input_path)
    
    # Process video
    result_path = process(input_path, output_path)
    
    if result_path is None:
      return jsonify({'error': 'Video processing failed'}), 500
    
    # Send processed video
    return send_file(
      output_path,
      mimetype='video/mp4',
      as_attachment=True,
      download_name='processed_video.mp4'
    )
  
  except Exception as e:
    return jsonify({'error': str(e)}), 500
  
  finally:
    # Cleanup temp files (after response is sent)
    if input_path and os.path.exists(input_path):
      try:
        os.unlink(input_path)
      except:
        pass
    # Note: output_path cleanup happens after send_file completes
    # Consider using @app.after_request or background cleanup

if __name__ == '__main__':
  app.run(debug=True)
