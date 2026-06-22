@IsTest
private class WebToLeadServiceTest {

    @TestSetup
    static void makeData() {
        // No shared data needed; tests are self-contained
    }

    // -------------------------------------------------------
    // isDuplicateLead
    // -------------------------------------------------------

    @IsTest
    static void test_isDuplicateLead_returnsFalse_whenNoMatchingLead() {
        Test.startTest();
        Boolean result = WebToLeadService.isDuplicateLead('notexisting@example.com');
        Test.stopTest();
        System.assertEquals(false, result, 'Should return false when no matching lead exists');
    }

    @IsTest
    static void test_isDuplicateLead_returnsTrue_whenMatchFound() {
        Lead existing = new Lead(FirstName = 'Jane', LastName = 'Doe',
                                  Email = 'jane@example.com', Company = 'Acme');
        insert existing;
        Test.startTest();
        Boolean result = WebToLeadService.isDuplicateLead('jane@example.com');
        Test.stopTest();
        System.assertEquals(true, result, 'Should return true when a non-converted lead with same email exists');
    }

    @IsTest
    static void test_isDuplicateLead_returnsFalse_forBlankEmail() {
        Test.startTest();
        Boolean result = WebToLeadService.isDuplicateLead('');
        Test.stopTest();
        System.assertEquals(false, result, 'Blank email should not be treated as duplicate');
    }

    @IsTest
    static void test_createLeadFromWebEnquiry_success() {
        WebToLeadService.LeadRequest req = buildRequest('john@example.com');
        Test.startTest();
        Id leadId = WebToLeadService.createLeadFromWebEnquiry(req);
        Test.stopTest();
        System.assertNotEquals(null, leadId, 'Lead Id should be returned on success');
        Lead created = [SELECT FirstName, LastName, Email, Phone, Company,
                               Country, LeadSource, Description
                        FROM Lead WHERE Id = :leadId LIMIT 1];
        System.assertEquals('John',             created.FirstName,  'First name mismatch');
        System.assertEquals('Smith',            created.LastName,   'Last name mismatch');
        System.assertEquals('john@example.com', created.Email,      'Email mismatch');
        System.assertEquals('Web',              created.LeadSource, 'LeadSource should be Web');
        System.assert(created.Description.contains('Cloud Suite'), 'Description should contain product interest');
    }

    @IsTest
    static void test_createLeadFromWebEnquiry_returnNull_onDuplicate() {
        Lead existing = new Lead(FirstName = 'Existing', LastName = 'Lead',
                                  Email = 'dup@example.com', Company = 'OldCo');
        insert existing;
        WebToLeadService.LeadRequest req = buildRequest('dup@example.com');
        Test.startTest();
        Id result = WebToLeadService.createLeadFromWebEnquiry(req);
        Test.stopTest();
        System.assertEquals(null, result, 'Should return null for a duplicate lead');
    }

    @IsTest
    static void test_createLeadFromWebEnquiry_noProductInterest() {
        WebToLeadService.LeadRequest req = buildRequest('nointerest@example.com');
        req.productInterest = null;
        req.message = 'Just a message';
        Test.startTest();
        Id leadId = WebToLeadService.createLeadFromWebEnquiry(req);
        Test.stopTest();
        System.assertNotEquals(null, leadId, 'Lead should be created when productInterest is null');
    }

    @IsTest
    static void test_notifySalesRep_doesNotThrow_whenOwnerEmailBlank() {
        Lead mockLead = new Lead(FirstName = 'Test', LastName = 'User', Email = 'test@x.com', Company = 'Co');
        insert mockLead;
        Lead queried = [SELECT Id, OwnerId, Owner.Email, Owner.Name, FirstName, LastName, Email
                        FROM Lead WHERE Id = :mockLead.Id LIMIT 1];
        Test.startTest();
        WebToLeadService.notifySalesRep(queried);
        Test.stopTest();
        System.assert(true, 'notifySalesRep should not throw for leads with potentially blank owner email');
    }

    private static WebToLeadService.LeadRequest buildRequest(String email) {
        WebToLeadService.LeadRequest req = new WebToLeadService.LeadRequest();
        req.firstName       = 'John';
        req.lastName        = 'Smith';
        req.email           = email;
        req.phone           = '+1-555-0100';
        req.company         = 'TestCo';
        req.country         = 'Australia';
        req.productInterest = 'Cloud Suite';
        req.message         = 'Interested in enterprise plan.';
        return req;
    }
}