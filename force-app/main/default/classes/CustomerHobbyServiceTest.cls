/**
 * @description Test class for CustomerHobbyService.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-12
 * @date 2026-06-08
 */
@IsTest
private class CustomerHobbyServiceTest {

    @TestSetup
    static void makeData() {
        List<Customer__c> customers = new List<Customer__c>();
        customers.add(new Customer__c(Name = 'Test Customer 1', My_Hobby__c = false));
        customers.add(new Customer__c(Name = 'Test Customer 2', My_Hobby__c = true));
        insert customers;
    }

    // ---------------------------------------------------------------
    // getCustomerWithHobby — success path
    // ---------------------------------------------------------------
    @IsTest
    static void test_getCustomerWithHobby_success() {
        // Given
        Customer__c existing = [SELECT Id FROM Customer__c WHERE Name = 'Test Customer 1' LIMIT 1];

        // When
        Test.startTest();
        Customer__c result = CustomerHobbyService.getCustomerWithHobby(existing.Id);
        Test.stopTest();

        // Then
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(existing.Id, result.Id, 'Returned record Id should match requested Id');
        System.assertEquals(false, result.My_Hobby__c, 'My_Hobby__c should be false for Test Customer 1');
    }

    // ---------------------------------------------------------------
    // getCustomerWithHobby — null Id throws exception
    // ---------------------------------------------------------------
    @IsTest
    static void test_getCustomerWithHobby_nullId_throwsException() {
        // Given / When / Then
        Test.startTest();
        try {
            CustomerHobbyService.getCustomerWithHobby(null);
            System.assert(false, 'Expected AuraHandledException was not thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage() != null, 'Exception message should not be null');
        }
        Test.stopTest();
    }

    // ---------------------------------------------------------------
    // updateHobbyFlag — success: set to true
    // ---------------------------------------------------------------
    @IsTest
    static void test_updateHobbyFlag_setTrue_success() {
        // Given
        Customer__c existing = [SELECT Id FROM Customer__c WHERE Name = 'Test Customer 1' LIMIT 1];
        List<Id> ids = new List<Id>{ existing.Id };

        // When
        Test.startTest();
        CustomerHobbyService.updateHobbyFlag(ids, true);
        Test.stopTest();

        // Then
        Customer__c updated = [SELECT My_Hobby__c FROM Customer__c WHERE Id = :existing.Id];
        System.assertEquals(true, updated.My_Hobby__c, 'My_Hobby__c should be updated to true');
    }

    // ---------------------------------------------------------------
    // updateHobbyFlag — success: set to false
    // ---------------------------------------------------------------
    @IsTest
    static void test_updateHobbyFlag_setFalse_success() {
        // Given
        Customer__c existing = [SELECT Id FROM Customer__c WHERE Name = 'Test Customer 2' LIMIT 1];
        List<Id> ids = new List<Id>{ existing.Id };

        // When
        Test.startTest();
        CustomerHobbyService.updateHobbyFlag(ids, false);
        Test.stopTest();

        // Then
        Customer__c updated = [SELECT My_Hobby__c FROM Customer__c WHERE Id = :existing.Id];
        System.assertEquals(false, updated.My_Hobby__c, 'My_Hobby__c should be updated to false');
    }

    // ---------------------------------------------------------------
    // updateHobbyFlag — bulk: 200 records
    // ---------------------------------------------------------------
    @IsTest
    static void test_updateHobbyFlag_bulk_success() {
        // Given
        List<Customer__c> bulkCustomers = new List<Customer__c>();
        for (Integer i = 0; i < 200; i++) {
            bulkCustomers.add(new Customer__c(Name = 'Bulk Customer ' + i, My_Hobby__c = false));
        }
        insert bulkCustomers;

        List<Id> bulkIds = new List<Id>();
        for (Customer__c c : bulkCustomers) {
            bulkIds.add(c.Id);
        }

        // When
        Test.startTest();
        CustomerHobbyService.updateHobbyFlag(bulkIds, true);
        Test.stopTest();

        // Then
        Integer updatedCount = [SELECT COUNT() FROM Customer__c WHERE My_Hobby__c = true AND Name LIKE 'Bulk Customer%'];
        System.assertEquals(200, updatedCount, 'All 200 bulk customer records should have My_Hobby__c = true');
    }

    // ---------------------------------------------------------------
    // updateHobbyFlag — empty list throws exception
    // ---------------------------------------------------------------
    @IsTest
    static void test_updateHobbyFlag_emptyList_throwsException() {
        // Given
        List<Id> emptyIds = new List<Id>();

        // When / Then
        Test.startTest();
        try {
            CustomerHobbyService.updateHobbyFlag(emptyIds, true);
            System.assert(false, 'Expected AuraHandledException was not thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage() != null, 'Exception message should not be null');
        }
        Test.stopTest();
    }

    // ---------------------------------------------------------------
    // updateHobbyFlag — null list throws exception
    // ---------------------------------------------------------------
    @IsTest
    static void test_updateHobbyFlag_nullList_throwsException() {
        // When / Then
        Test.startTest();
        try {
            CustomerHobbyService.updateHobbyFlag(null, true);
            System.assert(false, 'Expected AuraHandledException was not thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage() != null, 'Exception message should not be null');
        }
        Test.stopTest();
    }
}