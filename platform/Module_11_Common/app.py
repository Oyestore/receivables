import os
from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Ensure Tesseract OCR path is configured if not in system PATH
# pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract' # Example for Linux

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def preprocess_image(image_path):
    """Basic image preprocessing to improve OCR accuracy."""
    try:
        img = cv2.imread(image_path)
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Apply thresholding
        # _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV) # Example, might need tuning
        # Apply Gaussian blur to reduce noise
        # blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        # For now, just return grayscale, further preprocessing can be added
        processed_image_path = os.path.join(app.config["UPLOAD_FOLDER"], "processed_" + os.path.basename(image_path))
        cv2.imwrite(processed_image_path, gray)
        return processed_image_path
    except Exception as e:
        print(f"Error during image preprocessing: {e}")
        return image_path # Return original path if preprocessing fails

@app.route("/api/v1/ocr/extract-text", methods=["POST"])
def extract_text_from_image():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file:
        try:
            filename = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
            file.save(filename)

            # Preprocess the image
            # preprocessed_image_path = preprocess_image(filename) # Optional: enable if needed
            preprocessed_image_path = filename # Using original for now

            # Perform OCR
            extracted_text = pytesseract.image_to_string(Image.open(preprocessed_image_path))
            
            # Clean up uploaded and processed files (optional)
            # os.remove(filename)
            # if preprocessed_image_path != filename: 
            #     os.remove(preprocessed_image_path)

            return jsonify({"extracted_text": extracted_text}), 200
        except pytesseract.TesseractNotFoundError:
            return jsonify({"error": "Tesseract is not installed or not found in your PATH."}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "File processing failed"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)

