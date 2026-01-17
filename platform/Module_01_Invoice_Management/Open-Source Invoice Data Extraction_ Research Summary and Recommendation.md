# Open-Source Invoice Data Extraction: Research Summary and Recommendation

## 1. Introduction

This document summarizes the research conducted on open-source tools and approaches for AI-assisted invoice data extraction, as requested for Phase 1.1 of the Invoice Generation Agent. The goal is to identify a robust, self-hostable, open-source solution that integrates well with our Node.js stack and provides accurate structured data from invoices.

## 2. Options Explored

Several options were investigated, ranging from general OCR engines requiring custom parsing to more specialized invoice processing tools.

### 2.1. Tesseract OCR (including Tesseract.js)

*   **Description:** A widely-used open-source OCR engine. Tesseract.js allows direct use in Node.js, while Python wrappers are also common for microservice deployment.
*   **Pros:**
    *   Mature, strong community support, extensive language support.
    *   Free and open-source.
    *   Good raw text extraction accuracy on clear, machine-printed documents.
*   **Cons & Considerations for Invoices:**
    *   Highly dependent on input image quality; requires significant pre-processing (deskewing, noise removal, binarization).
    *   Outputs raw text. Extracting structured fields (vendor, date, line items, totals) requires a substantial custom parsing layer (regex, keyword spotting, layout analysis rules).
    *   Adapting to diverse invoice layouts is challenging without advanced parsing logic.
*   **Sources:** Koncile.ai, Klippa, Docsumo.

### 2.2. Invoiceable (Flask App with Tesseract & ML Model)

*   **Description:** An open-source Flask (Python) application that uses Tesseract OCR and an open-source machine learning model to parse invoices, documents, and resumes.
*   **Pros:**
    *   Specifically targets invoice parsing, suggesting some built-in intelligence beyond raw OCR.
    *   Combines OCR with an ML model, potentially offering better structured data extraction than Tesseract alone.
    *   Open-source and self-hostable.
*   **Cons & Considerations:**
    *   Being a Flask app, it would need to be run as a separate microservice and called from our Node.js backend. This adds a bit of architectural complexity but is manageable.
    *   The effectiveness of its ML model on diverse invoice formats needs to be assessed. Training or fine-tuning might be necessary.
    *   Documentation on the specifics of the ML model and its training data might be limited.
*   **Sources:** Eden AI, GitHub (InvoiceableAI/Invoiceable).

### 2.3. Unstract (with DeepSeek or other LLMs)

*   **Description:** An open-source platform for document data extraction that can be self-hosted and integrated with various LLMs, including open-source models like DeepSeek.
*   **Pros:**
    *   Designed for structured data extraction from documents, not just OCR.
    *   Leverages LLMs, which can provide more sophisticated understanding and extraction capabilities, especially for varied layouts and complex fields.
    *   Supports self-hosting with an entirely open-source AI tech stack.
    *   Aligns with the user preference for considering DeepSeek R1.
*   **Cons & Considerations:**
    *   Setting up and managing an LLM (even an open-source one) for self-hosting can be resource-intensive (compute, memory).
    *   The accuracy and cost-effectiveness (in terms of compute) would depend on the chosen LLM and its fine-tuning for invoices.
    *   Integration might be more complex than a simpler OCR tool, involving managing the Unstract platform and the LLM service.
*   **Sources:** Unstract blog.

### 2.4. InvoiceNet (Deep Learning Model)

*   **Description:** An open-source project using a deep neural network to extract information from invoice documents. It often involves training a model on labeled invoice data.
*   **Pros:**
    *   Deep learning models can achieve high accuracy if trained on a relevant and sufficiently large dataset.
    *   Can learn to identify fields based on layout and context, potentially handling varied formats better than rule-based parsers alone.
*   **Cons & Considerations:**
    *   Requires a dataset of labeled invoices for training, which can be time-consuming to create if not readily available.
    *   Training and deploying deep learning models require specific expertise and infrastructure (potentially GPUs for training).
    *   The pre-trained models available might not generalize well to all types of invoices without fine-tuning.
    *   Typically Python-based, so would be run as a microservice.
*   **Sources:** GitHub (naiveHobo/InvoiceNet, RijunLiao/InvoiceNet).

### 2.5. Other tools like Affinda (Commercial with some open-source discussion)

*   While Affinda discusses open-source APIs, their core offering appears to be a commercial product. For a purely open-source, self-hosted solution, this might be less suitable unless a truly free and open-source community version with sufficient capabilities is available and clearly documented for self-hosting.

## 3. Comparative Analysis Summary

| Feature                       | Tesseract.js + Custom Parser | Invoiceable                      | Unstract + LLM (e.g., DeepSeek) | InvoiceNet                       |
| ----------------------------- | ---------------------------- | -------------------------------- | ------------------------------- | -------------------------------- |
| **Primary Technology**        | OCR + Rules                  | OCR + ML (pre-trained/generic)   | OCR + LLM                       | Deep Learning (custom trained)   |
| **Structured Data Output**    | Low (requires heavy custom)  | Medium (model dependent)         | High (LLM dependent)            | High (if well-trained)         |
| **Ease of Node.js Integration** | High (Tesseract.js direct)   | Medium (Python microservice)     | Medium (Python microservice)    | Medium (Python microservice)     |
| **Self-Hosted**               | Yes                          | Yes                              | Yes                             | Yes                              |
| **Open Source**               | Yes                          | Yes                              | Yes                             | Yes                              |
| **Custom Training Needed**    | No (but custom parsing dev)  | Potentially for ML model         | Potentially for LLM fine-tuning | Yes (significant)                |
| **Development Effort (Parsing)**| High                         | Medium                           | Low-Medium (prompt engineering) | Low (if model is good)         |
| **Infrastructure Complexity** | Low                          | Medium                           | High (LLM hosting)              | Medium-High (DL model serving) |

## 4. Recommendation for Phase 1.1

Considering the need for a balance between capability, development effort for Phase 1.1, open-source nature, self-hosting, and potential for future enhancement, a hybrid approach is recommended:

**Option 1 (Iterative Approach - Recommended Start):**

1.  **Foundation with Tesseract + Custom Parsing:**
    *   **OCR Engine:** Utilize **Tesseract OCR**. We can start with a **Python-based Tesseract microservice**. This provides access to the latest Tesseract versions and robust image pre-processing libraries available in Python (e.g., OpenCV). Our Node.js backend will call this microservice.
    *   **Image Pre-processing:** Implement a solid image pre-processing pipeline (deskewing, noise reduction, binarization, resolution enhancement) within the Python microservice before OCR.
    *   **Custom Parsing Module (in Node.js or Python service):** Develop an initial rule-based and keyword-driven parsing module to extract key fields from Tesseract\"s raw text output. This module will target common invoice fields (Invoice ID, Date, Total Amount, Vendor Name). This gives us a working baseline quickly.

2.  **Future Enhancement with LLM (Post Phase 1.1 or as part of advanced features):**
    *   Once the baseline is established, explore integrating an open-source LLM (like a self-hosted DeepSeek R1 via a tool like Unstract, or directly) to **enhance the structuring of the OCR output or to handle more complex invoices where rule-based parsing fails.** The LLM would take the OCR text (and potentially layout information) and return a structured JSON.

**Option 2 (More Advanced Start - Higher Initial Effort):**

*   Directly attempt to use a framework like **Unstract with a self-hosted open-source LLM (e.g., a smaller, efficient version of DeepSeek or similar if available and suitable for invoice parsing).**
    *   This has the potential for higher accuracy on varied formats from the outset but involves a steeper learning curve and more complex initial setup for the LLM infrastructure.

**Why Option 1 is preferred for starting Phase 1.1:**

*   **Incremental Complexity:** It allows us to get a functional OCR and basic extraction system running relatively quickly with Tesseract.
*   **Lower Initial Infrastructure Overhead:** Avoids the immediate need to set up and manage a full LLM serving environment.
*   **Learning and Iteration:** We can learn from the limitations of the initial custom parser and make more informed decisions about how and where an LLM can provide the most value.
*   **Flexibility:** The Tesseract microservice can later feed its output to an LLM-based structuring service.

**Invoiceable and InvoiceNet** are interesting but might require more specific investigation into their pre-trained models\" generalizability or a significant effort in data collection and training (for InvoiceNet) to be reliable for diverse invoices immediately.

## 5. Next Steps for Detailed Design (Phase 1.1)

Based on Option 1 (Iterative Approach):

1.  **Design the Tesseract Microservice (Python):**
    *   API for receiving an image.
    *   Image pre-processing pipeline.
    *   Tesseract OCR execution.
    *   API for returning raw OCR text (and potentially basic layout info if feasible).
2.  **Design the Custom Parsing Module (Node.js - within Invoice Generation Agent):**
    *   Logic to receive raw text from the Tesseract service.
    *   Rules, regex, and keyword patterns for identifying and extracting: Invoice Number, Invoice Date, Due Date, Vendor Name, Client Name, Line Items (Description, Quantity, Unit Price, Item Total), Subtotal, Tax Amounts, Grand Total.
    *   Output structured JSON.
3.  **Define Data Models:** For storing the extracted (and manually entered/corrected) invoice data.
4.  **Define API Endpoints:** For uploading invoices for AI-assist, and for manual invoice creation/editing.
5.  **Outline Validation Rules:** For both extracted and manually entered data.

This approach provides a pragmatic path forward, leveraging open-source tools effectively while managing complexity for the initial phase.
