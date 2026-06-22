/**
 * @description Handles automated Lead creation from website enquiry form submissions.
 *              Covers duplicate prevention, lead assignment, and sales team notification.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-19
 * @date 2026-06-22
 */
public with sharing class WebToLeadService {

    /**
     * @description Wrapper class to receive enquiry form data from website
     */
    public class LeadRequest {
        public String firstName;
        public String lastName;
        public String email;
        public String phone;
        public String company;
        public String country;
        public String productInterest;
        public String message;
    }

    /**
     * @description Creates a Lead from a website enquiry, skipping duplicates.
     *              Notifies the assigned sales rep on successful creation.
     * @param request LeadRequest wrapper containing all form fields
     * @return Id of the newly created Lead, or null if duplicate detected
     */
    public static Id createLeadFromWebEnquiry(LeadRequest request) {
        try {
            // Duplicate check — query before DML
            if (isDuplicateLead(request.email)) {
                return null;
            }

            Lead newLead = new Lead(
                FirstName       = request.firstName,
                LastName        = request.lastName,
                Email           = request.email,
                Phone           = request.phone,
                Company         = request.company,
                Country         = request.country,
                Description     = request.message,
                LeadSource      = 'Web'
            );

            if (String.isNotBlank(request.productInterest)) {
                newLead.Description = 'Product Interest: ' + request.productInterest
                    + (String.isNotBlank(request.message) ? '\n\nMessage: ' + request.message : '');
            }

            insert newLead;

            // Re-query to get OwnerId assigned by lead assignment rules
            Lead insertedLead = [
                SELECT Id, OwnerId, Owner.Email, Owner.Name, FirstName, LastName, Email
                FROM Lead
                WHERE Id = :newLead.Id
                LIMIT 1
            ];

            notifySalesRep(insertedLead);

            return insertedLead.Id;

        } catch (Exception e) {
            throw new AuraHandledException('WebToLeadService error: ' + e.getMessage());
        }
    }

    /**
     * @description Checks for an existing open (non-converted) lead with the same email
     * @param email Email address to check
     * @return true if a duplicate exists
     */
    @TestVisible
    private static Boolean isDuplicateLead(String email) {
        if (String.isBlank(email)) {
            return false;
        }
        List<Lead> existingLeads = [
            SELECT Id
            FROM Lead
            WHERE Email = :email
              AND IsConverted = false
            LIMIT 1
        ];
        return !existingLeads.isEmpty();
    }

    /**
     * @description Sends an email notification to the lead owner (sales rep)
     * @param lead The newly inserted Lead record with owner details
     */
    @TestVisible
    private static void notifySalesRep(Lead lead) {
        if (lead.Owner == null || String.isBlank(lead.Owner.Email)) {
            return;
        }

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new List<String>{ lead.Owner.Email });
        mail.setSubject('New Web Lead: ' + lead.FirstName + ' ' + lead.LastName);
        mail.setPlainTextBody(
            'Hi ' + lead.Owner.Name + ',\n\n'
            + 'A new lead has been assigned to you from the company website.\n\n'
            + 'Name: ' + lead.FirstName + ' ' + lead.LastName + '\n'
            + 'Email: ' + lead.Email + '\n\n'
            + 'Please follow up promptly.\n\n'
            + 'DeliveryIQ – Automated Notification'
        );
        mail.setSaveAsActivity(false);

        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
    }
}