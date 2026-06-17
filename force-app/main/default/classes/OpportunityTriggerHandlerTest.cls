/**
 * @description Test class for OpportunityTriggerHandler.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-17
 * @date 2026-06-17
 */
@IsTest
private class OpportunityTriggerHandlerTest {

    // ─── Test Data Setup ────────────────────────────────────────────────────────

    @TestSetup
    static void makeData() {
        Account acc = new Account(Name = 'Test Account SCRUM-17');
        insert acc;
    }

    // ─── Positive Test: Single Opportunity ──────────────────────────────────────

    @IsTest
    static void test_createTask_singleOpportunity_success() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Account SCRUM-17' LIMIT 1];

        Opportunity opp = new Opportunity(
            Name        = 'Test Opp Single',
            AccountId   = acc.Id,
            StageName   = 'Prospecting',
            CloseDate   = Date.today().addDays(30)
        );

        Test.startTest();
        insert opp;
        Test.stopTest();

        // Re-query the opportunity to get CreatedById
        Opportunity insertedOpp = [SELECT Id, CreatedById FROM Opportunity WHERE Id = :opp.Id];

        List<Task> tasks = [
            SELECT Id, Subject, WhatId, OwnerId, Status, Priority, ActivityDate
            FROM Task
            WHERE WhatId = :opp.Id
        ];

        System.assertEquals(1, tasks.size(), 'Exactly one Task should be created per Opportunity.');
        System.assertEquals(insertedOpp.CreatedById, tasks[0].OwnerId, 'Task owner should match the Opportunity creator.');
        System.assertEquals('Not Started', tasks[0].Status, 'Task status should default to Not Started.');
        System.assertEquals('Normal', tasks[0].Priority, 'Task priority should default to Normal.');
        System.assert(tasks[0].Subject.contains('Test Opp Single'), 'Task subject should reference the Opportunity name.');
        System.assertEquals(Date.today().addDays(7), tasks[0].ActivityDate, 'Task due date should be 7 days from today.');
    }

    // ─── Positive Test: Bulk — 200 Opportunities ────────────────────────────────

    @IsTest
    static void test_createTask_bulkOpportunities_success() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Account SCRUM-17' LIMIT 1];

        List<Opportunity> opps = new List<Opportunity>();
        for (Integer i = 0; i < 200; i++) {
            opps.add(new Opportunity(
                Name      = 'Bulk Opp ' + i,
                AccountId = acc.Id,
                StageName = 'Prospecting',
                CloseDate = Date.today().addDays(30)
            ));
        }

        Test.startTest();
        insert opps;
        Test.stopTest();

        List<Task> tasks = [SELECT Id FROM Task WHERE WhatId IN :opps];
        System.assertEquals(200, tasks.size(), 'One Task should be created for each of the 200 Opportunities.');
    }

    // ─── Negative Test: Empty List ───────────────────────────────────────────────

    @IsTest
    static void test_createTask_emptyList_noTasksCreated() {
        Test.startTest();
        OpportunityTriggerHandler.createTasksForNewOpportunities(new List<Opportunity>());
        Test.stopTest();

        // No DML should have occurred; query returns zero
        List<Task> tasks = [SELECT Id FROM Task];
        System.assertEquals(0, tasks.size(), 'No Tasks should be created when an empty list is passed.');
    }

    // ─── Negative Test: Null List ────────────────────────────────────────────────

    @IsTest
    static void test_createTask_nullList_noException() {
        Test.startTest();
        try {
            OpportunityTriggerHandler.createTasksForNewOpportunities(null);
            System.assert(true, 'Null list should be handled gracefully without exception.');
        } catch (Exception e) {
            System.assert(false, 'No exception should be thrown for null input. Got: ' + e.getMessage());
        }
        Test.stopTest();
    }
}