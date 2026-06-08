/**
 * @description Service class to manage the My_Hobby__c checkbox field on Customer__c.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-12
 * @date 2026-06-08
 */
public with sharing class CustomerHobbyService {

    /**
     * @description Retrieves a Customer__c record by Id, including the My_Hobby__c field.
     * @param customerId The Id of the Customer__c record.
     * @return The Customer__c record with My_Hobby__c populated.
     */
    public static Customer__c getCustomerWithHobby(Id customerId) {
        if (customerId == null) {
            throw new AuraHandledException('Customer Id must not be null.');
        }
        try {
            return [
                SELECT Id, Name, My_Hobby__c
                FROM Customer__c
                WHERE Id = :customerId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving customer: ' + e.getMessage());
        }
    }

    /**
     * @description Updates the My_Hobby__c checkbox for a list of Customer__c records.
     * @param customerIds List of Customer__c record Ids to update.
     * @param hobbyValue The boolean value to set on My_Hobby__c.
     */
    public static void updateHobbyFlag(List<Id> customerIds, Boolean hobbyValue) {
        if (customerIds == null || customerIds.isEmpty()) {
            throw new AuraHandledException('Customer Id list must not be null or empty.');
        }
        try {
            List<Customer__c> customersToUpdate = new List<Customer__c>();
            for (Id custId : customerIds) {
                customersToUpdate.add(new Customer__c(
                    Id = custId,
                    My_Hobby__c = hobbyValue
                ));
            }
            update customersToUpdate;
        } catch (DmlException e) {
            throw new AuraHandledException('Error updating My_Hobby__c: ' + e.getMessage());
        }
    }
}