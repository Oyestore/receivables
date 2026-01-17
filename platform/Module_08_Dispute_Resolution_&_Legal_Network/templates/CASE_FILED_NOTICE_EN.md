# Case Filed Notification Template (English)

**Template Code:** CASE_FILED_NOTICE_EN  
**Type:** Case Filed Notification  
**Language:** English

---

## Template Content

```handlebars
NOTICE OF LEGAL PROCEEDINGS INITIATED

Date: {{currentDate}}
Case Ref: {{caseReferenceNumber}}

To:
{{customerName}}
{{customerAddress}}
{{customerCity}}, {{customerState}} - {{customerPincode}}

Subject: Notice of Legal Case Filed for Recovery of Outstanding Dues

Dear {{customerName}},

This is to inform you that {{companyName}} has been compelled to initiate legal proceedings against you for the recovery of outstanding dues amounting to {{currency totalDue}}.

**CASE DETAILS:**

- Case Number: {{caseNumber}}
- Filed Date: {{formatDate caseFiledDate}}
- Court/Forum: {{courtName}}
- Case Type: {{caseType}}
- Invoice Reference: {{invoiceNumber}}
- Amount Claimed: {{currency totalDue}}

**BACKGROUND:**

Despite our repeated attempts to resolve this matter amicably, including:
- {{reminderCount}} payment reminders
- Legal notice dated {{formatDate legalNoticeDate}}
- Final demand letter dated {{formatDate demandLetterDate}}
- Settlement proposal dated {{formatDate settlementProposalDate}}

You have failed to settle the outstanding amount, leaving us with no option but to seek legal intervention.

**WHAT THIS MEANS:**

1. **Court Summons:** You will receive an official summons from {{courtName}} to appear before the court.

2. **Legal Consequences:** If you fail to respond or appear, the court may pass an ex-parte judgment against you.

3. **Additional Costs:** You will be liable for:
   - Court fees: {{currency courtFees}}
   - Legal fees: {{currency legalFees}}
   - Interest on delayed payment
   - Any other costs as determined by the court

4. **Credit Impact:** This legal action will be reported to credit bureaus, affecting your creditworthiness.

**IMMEDIATE ACTION REQUIRED:**

You still have an opportunity to settle this matter out of court. To do so:

1. Pay the full outstanding amount of {{currency totalDue}} plus court costs of {{currency courtFees}} immediately.
2. Contact us within {{settlementDays}} days to discuss settlement.
3. Engage legal counsel to represent you in these proceedings.

**PAY

MENT DETAILS (For Out-of-Court Settlement):**

Amount to Pay: {{currency totalWithCosts}}  
Bank Account: {{bankAccountNumber}}  
IFSC: {{bankIFSC}}  
Reference: {{caseReferenceNumber}}

**IMPORTANT DATES:**

- First Hearing: {{formatDate firstHearingDate}}
- Last Date for Settlement: {{formatDate settlementDeadline}}
- Response Deadline: {{formatDate responseDeadline}}

**LEGAL REPRESENTATION:**

Our Legal Counsel:  
{{legalProviderName}}  
{{legalProviderBarNumber}}  
{{legalProviderContact}}

**You are strongly advised to seek legal advice immediately.**

For any queries or to discuss settlement, contact:
{{companyContact}}  
Email: {{companyEmail}}

This notice is issued as a matter of record and courtesy. The legal proceedings will continue irrespective of your response, unless full settlement is made.

Yours sincerely,

For {{companyName}}

{{authorizedSignatory}}
{{signatoryDesignation}}

Enclosures:
1. Copy of Court Filing Receipt
2. Copy of Original Invoice
3. Copy of Previous Correspondence
```

---

## Variables

```json
{
  "variables": [
    { "name": "caseReferenceNumber", "type": "string", "required": true, "description": "Internal case reference" },
    { "name": "customerName", "type": "string", "required": true, "description": "Defendant name" },
    { "name": "customerAddress", "type": "string", "required": true, "description": "Address" },
    { "name": "customerCity", "type": "string", "required": true, "description": "City" },
    { "name": "customerState", "type": "string", "required": true, "description": "State" },
    { "name": "customerPincode", "type": "string", "required": true, "description": "Pincode" },
    { "name": "companyName", "type": "string", "required": true, "description": "Plaintiff company name" },
    { "name": "companyContact", "type": "string", "required": true, "description": "Company phone" },
    { "name": "companyEmail", "type": "string", "required": true, "description": "Company email" },
    { "name": "caseNumber", "type": "string", "required": true, "description": "Official court case number" },
    { "name": "caseFiledDate", "type": "date", "required": true, "description": "Date case was filed" },
    { "name": "courtName", "type": "string", "required": true, "description": "Court or MSME Samadhaan" },
    { "name": "caseType", "type": "string", "required": true, "description": "e.g., Civil Suit, MSME Complaint" },
    { "name": "invoiceNumber", "type": "string", "required": true, "description": "Invoice reference" },
    { "name": "totalDue", "type": "number", "required": true, "description": "Amount claimed" },
    { "name": "reminderCount", "type": "number", "required": true, "description": "Number of reminders sent" },
    { "name": "legalNoticeDate", "type": "date", "required": false, "description": "Legal notice date" },
    { "name": "demandLetterDate", "type": "date", "required": false, "description": "Demand letter date" },
    { "name": "settlementProposalDate", "type": "date", "required": false, "description": "Settlement proposal date" },
    { "name": "courtFees", "type": "number", "required": true, "description": "Court filing fees" },
    { "name": "legalFees", "type": "number", "required": true, "description": "Legal representation fees" },
    { "name": "totalWithCosts", "type": "number", "required": true, "description": "Total including all costs" },
    { "name": "settlementDays", "type": "number", "required": true, "description": "Days to settle (e.g., 7)" },
    { "name": "firstHearingDate", "type": "date", "required": true, "description": "First court hearing date" },
    { "name": "settlementDeadline", "type": "date", "required": true, "description": "Last date for settlement" },
    { "name": "responseDeadline", "type": "date", "required": true, "description": "Response deadline" },
    { "name": "bankAccountNumber", "type": "string", "required": true, "description": "Account for payment" },
    { "name": "bankIFSC", "type": "string", "required": true, "description": "IFSC code" },
    { "name": "legalProviderName", "type": "string", "required": true, "description": "Lawyer name" },
    { "name": "legalProviderBarNumber", "type": "string", "required": true, "description": "Bar number" },
    { "name": "legalProviderContact", "type": "string", "required": true, "description": "Lawyer contact" },
    { "name": "authorizedSignatory", "type": "string", "required": true, "description": "Signatory name" },
    { "name": "signatoryDesignation", "type": "string", "required": true, "description": "Designation" }
  ]
}
```
