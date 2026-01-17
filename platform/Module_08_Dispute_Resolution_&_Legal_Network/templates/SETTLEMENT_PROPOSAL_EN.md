# Settlement Proposal Template (English)

**Template Code:** SETTLEMENT_PROPOSAL_EN  
**Type:** Settlement Proposal  
**Language:** English

---

## Template Content

```handlebars
SETTLEMENT PROPOSAL

Date: {{currentDate}}
Proposal Ref: {{proposalNumber}}

To:
{{customerName}}
{{customerAddress}}
{{customerCity}}, {{customerState}} - {{customerPincode}}

Subject: Proposal for Settlement of Outstanding Dues

Dear {{customerName}},

With reference to the outstanding amount of {{currency totalDue}} against Invoice No. {{invoiceNumber}}, {{companyName}} is willing to offer a settlement arrangement to resolve this matter amicably.

**CURRENT OUTSTANDING:**

- Principal Amount: {{currency invoiceAmount}}
{{#if interestAmount}}
- Interest Charges: {{currency interestAmount}}
{{/if}}
{{#if lateFees}}
- Late Payment Fees: {{currency lateFees}}
{{/if}}
- **Total Outstanding:** {{currency totalDue}}

**SETTLEMENT OFFER:**

We propose the following settlement terms:

**Option 1: Lump Sum Settlement ({{lumpSumDiscount}}% Discount)**
- Settlement Amount: {{currency lumpSumAmount}}
- Payment Deadline: {{formatDate lumpSumDeadline}}
- Discount Offered: {{currency lumpSumDiscountAmount}}

**Option 2: Installment Plan**  
Total Amount: {{currency installmentTotal}}  
Number of Installments: {{installmentCount}}  
Monthly Payment: {{currency installmentAmount}}

Installment Schedule:
{{#each installmentSchedule}}
- Installment {{this.number}}: {{currency this.amount}} due on {{formatDate this.dueDate}}
{{/each}}

**TERMS AND CONDITIONS:**

1. This settlement offer is valid until {{formatDate offerValidity}}.
2. Upon full payment as per the agreed terms, {{companyName}} will:
   - Provide a No Dues Certificate
   - Close the dispute case
   - Withdraw any pending legal notices
3. Failure to adhere to the installment plan will result in the full original amount becoming immediately payable.
4. All payments must include {{invoiceNumber}} as reference.

**PAYMENT DETAILS:**

Bank Account: {{bankAccountNumber}}  
IFSC Code: {{bankIFSC}}  
Account Name: {{bankAccountName}}  
UPI: {{upiId}}

**BENEFITS OF ACCEPTING THIS PROPOSAL:**

✓ Avoid legal proceedings and associated costs  
✓ Waiver of {{#ifEquals settlementOption "lumpsum"}}{{lumpSumDiscount}}% ({{currency lumpSumDiscountAmount}}){{else}}interest charges{{/ifEquals}}  
✓ Flexible payment terms  
✓ Preserve business relationship  
✓ Avoid credit score impact  

Please confirm your acceptance of this settlement proposal by {{formatDate acceptanceDeadline}} by:
- Email: {{companyEmail}}
- Phone: {{companyContact}}
- Written confirmation to {{companyAddress}}

We look forward to resolving this matter amicably.

Yours sincerely,

For {{companyName}}

{{authorizedSignatory}}
{{signatoryDesignation}}

---

**ACCEPTANCE CLAUSE:**

I/We, {{customerName}}, accept the above settlement proposal under:
☐ Option 1: Lump Sum Payment
☐ Option 2: Installment Plan

Signature: ________________
Name: ________________
Date: ________________
```

---

## Variables

```json
{
  "variables": [
    { "name": "proposalNumber", "type": "string", "required": true, "description": "Proposal reference number" },
    { "name": "customerName", "type": "string", "required": true, "description": "Customer name" },
    { "name": "customerAddress", "type": "string", "required": true, "description": "Address" },
    { "name": "customerCity", "type": "string", "required": true, "description": "City" },
    { "name": "customerState", "type": "string", "required": true, "description": "State" },
    { "name": "customerPincode", "type": "string", "required": true, "description": "Pincode" },
    { "name": "companyName", "type": "string", "required": true, "description": "Company name" },
    { "name": "companyAddress", "type": "string", "required": true, "description": "Company address" },
    { "name": "companyEmail", "type": "string", "required": true, "description": "Email" },
    { "name": "companyContact", "type": "string", "required": true, "description": "Phone" },
    { "name": "invoiceNumber", "type": "string", "required": true, "description": "Invoice number" },
    { "name": "invoiceAmount", "type": "number", "required": true, "description": "Principal amount" },
    { "name": "totalDue", "type": "number", "required": true, "description": "Total outstanding" },
    { "name": "interestAmount", "type": "number", "required": false, "description": "Interest" },
    { "name": "lateFees", "type": "number", "required": false, "description": "Late fees" },
    { "name": "lumpSumDiscount", "type": "number", "required": true, "description": "Discount percentage" },
    { "name": "lumpSumAmount", "type": "number", "required": true, "description": "Settlement amount" },
    { "name": "lumpSumDeadline", "type": "date", "required": true, "description": "Lump sum deadline" },
    { "name": "lumpSumDiscountAmount", "type": "number", "required": true, "description": "Discount in rupees" },
    { "name": "installmentTotal", "type": "number", "required": true, "description": "Total for installments" },
    { "name": "installmentCount", "type": "number", "required": true, "description": "Number of installments" },
    { "name": "installmentAmount", "type": "number", "required": true, "description": "Monthly installment" },
    { "name": "installmentSchedule", "type": "array", "required": true, "description": "Array of installments" },
    { "name": "offerValidity", "type": "date", "required": true, "description": "Offer expiry date" },
    { "name": "acceptanceDeadline", "type": "date", "required": true, "description": "Acceptance deadline" },
    { "name": "bankAccountNumber", "type": "string", "required": true, "description": "Account number" },
    { "name": "bankIFSC", "type": "string", "required": true, "description": "IFSC" },
    { "name": "bankAccountName", "type": "string", "required": true, "description": "Account name" },
    { "name": "upiId", "type": "string", "required": false, "description": "UPI ID" },
    { "name": "authorizedSignatory", "type": "string", "required": true, "description": "Signatory" },
    { "name": "signatoryDesignation", "type": "string", "required": true, "description": "Designation" },
    { "name": "settlementOption", "type": "string", "required": false, "description": "lumpsum or installment" }
  ]
}
```
