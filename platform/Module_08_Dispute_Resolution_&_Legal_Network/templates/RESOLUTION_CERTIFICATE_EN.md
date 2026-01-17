# Resolution Certificate Template (English)

**Template Code:** RESOLUTION_CERTIFICATE_EN  
**Type:** Resolution Certificate  
**Language:** English

---

## Template Content

```handlebars
DISPUTE RESOLUTION CERTIFICATE

Certificate No.: {{certificateNumber}}  
Issue Date: {{currentDate}}

---

**This is to certify that**

The dispute between:

**CREDITOR:**  
{{companyName}}  
{{companyAddress}}  
GSTIN: {{companyGST}}

**and**

**DEBTOR:**  
{{customerName}}  
{{customerAddress}}  
{{#if customerGST}}GSTIN: {{customerGST}}{{/if}}

has been **SUCCESSFULLY RESOLVED** on {{formatDate resolutionDate}}.

---

**DISPUTE DETAILS:**

- Dispute Case ID: {{disputeCaseId}}
- Invoice Number: {{invoiceNumber}}
- Invoice Date: {{formatDate invoiceDate}}
- Original Amount: {{currency originalAmount}}
- Dispute Filed On: {{formatDate disputeFiledDate}}
- Resolution Method: {{resolutionMethod}}

**SETTLEMENT TERMS:**

- Settlement Amount Agreed: {{currency settlementAmount}}
{{#if discount}}
- Discount Granted: {{currency discountAmount}} ({{discountPercent}}%)
{{/if}}
- Payment Method: {{paymentMethod}}
{{#ifEquals paymentType "full"}}
- Payment Status: **PAID IN FULL** on {{formatDate paymentDate}}
{{else}}
- Payment Plan: {{installmentCount}} installments
- Installment Amount: {{currency installmentAmount}}
- Final Payment Date: {{formatDate finalPaymentDate}}
{{/ifEquals}}

**RESOLUTION CONFIRMATION:**

✓ Full payment received and reconciled  
✓ All legal notices withdrawn  
✓ No further claims or disputes exist  
✓ Parties agree to amicable resolution  

**MUTUAL AGREEMENT:**

Both parties hereby confirm that:

1. All outstanding dues have been settled as per the agreed terms.
2. Neither party has any further claims against the other relating to Invoice No. {{invoiceNumber}}.
3. Any legal proceedings initiated in connection with this dispute stand withdrawn/settled.
4. This resolution is final and binding on both parties.

**ACKNOWLEDGMENT:**

**For {{companyName}}:**

Name: {{companyRepName}}  
Designation: {{companyRepDesignation}}  
Date: {{formatDate resolutionDate}}  
Signature: ________________

**For {{customerName}}:**

Name: {{customerRepName}}  
Designation: {{customerRepDesignation}}  
Date: {{formatDate resolutionDate}}  
Signature: ________________

{{#if mediatorInvolved}}
**MEDIATED BY:**

{{mediatorName}}  
{{mediatorCredentials}}  
Signature: ________________
{{/if}}

---

**CERTIFICATE VALIDITY:**

This certificate serves as proof of complete and final resolution of the dispute. It may be used for:
- Updating credit records
- Internal accounting closure
- Regulatory compliance
- Future business references

**Issued under digital signature and seal of {{companyName}}**

---

**Contact for Verification:**  
Email: {{verificationEmail}}  
Phone: {{verificationContact}}  
Reference: {{certificateNumber}}

---

*This is a system-generated certificate. For queries, please quote the certificate number.*

**Date of Issue:** {{currentDate}}  
**Place of Issue:** {{placeOfIssue}}
```

---

## Variables

```json
{
  "variables": [
    { "name": "certificateNumber", "type": "string", "required": true, "description": "Unique certificate number" },
    { "name": "companyName", "type": "string", "required": true, "description": "Creditor company name" },
    { "name": "companyAddress", "type": "string", "required": true, "description": "Company address" },
    { "name": "companyGST", "type": "string", "required": false, "description": "Company GST number" },
    { "name": "customerName", "type": "string", "required": true, "description": "Debtor name" },
    { "name": "customerAddress", "type": "string", "required": true, "description": "Customer address" },
    { "name": "customerGST", "type": "string", "required": false, "description": "Customer GST" },
    { "name": "resolutionDate", "type": "date", "required": true, "description": "Date of resolution" },
    { "name": "disputeCaseId", "type": "string", "required": true, "description": "Case ID" },
    { "name": "invoiceNumber", "type": "string", "required": true, "description": "Invoice number" },
    { "name": "invoiceDate", "type": "date", "required": true, "description": "Invoice date" },
    { "name": "originalAmount", "type": "number", "required": true, "description": "Original invoice amount" },
    { "name": "disputeFiledDate", "type": "date", "required": true, "description": "Dispute filed date" },
    { "name": "resolutionMethod", "type": "string", "required": true, "description": "e.g., Mutual Settlement, Mediation" },
    { "name": "settlementAmount", "type": "number", "required": true, "description": "Final settlement amount" },
    { "name": "discount", "type": "boolean", "required": false, "description": "Was discount given" },
    { "name": "discountAmount", "type": "number", "required": false, "description": "Discount amount" },
    { "name": "discountPercent", "type": "number", "required": false, "description": "Discount percentage" },
    { "name": "paymentMethod", "type": "string", "required": true, "description": "Payment method used" },
    { "name": "paymentType", "type": "string", "required": true, "description": "full or installment" },
    { "name": "paymentDate", "type": "date", "required": false, "description": "Payment completion date" },
    { "name": "installmentCount", "type": "number", "required": false, "description": "Number of installments" },
    { "name": "installmentAmount", "type": "number", "required": false, "description": "Per installment amount" },
    { "name": "finalPaymentDate", "type": "date", "required": false, "description": "Last installment date" },
    { "name": "companyRepName", "type": "string", "required": true, "description": "Company representative" },
    { "name": "companyRepDesignation", "type": "string", "required": true, "description": "Rep designation" },
    { "name": "customerRepName", "type": "string", "required": true, "description": "Customer representative" },
    { "name": "customerRepDesignation", "type": "string", "required": true, "description": "Rep designation" },
    { "name": "mediatorInvolved", "type": "boolean", "required": false, "description": "Was there a mediator" },
    { "name": "mediatorName", "type": "string", "required": false, "description": "Mediator name" },
    { "name": "mediatorCredentials", "type": "string", "required": false, "description": "Mediator credentials" },
    { "name": "verificationEmail", "type": "string", "required": true, "description": "Email for verification" },
    { "name": "verificationContact", "type": "string", "required": true, "description": "Phone for verification" },
    { "name": "placeOfIssue", "type": "string", "required": true, "description": "City of issue" }
  ]
}
```
