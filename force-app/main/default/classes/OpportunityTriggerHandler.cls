/**
 * @description Handler class for OpportunityTrigger.
 *              Creates a follow-up Task for each newly created Opportunity,
 *              with the Task owner set to the Opportunity creator.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-17
 * @date 2026-06-17
 */
public with sharing class OpportunityTriggerHandler {

    /**
     * @description Creates a Task for each new Opportunity. Task owner is set
     *              to the Opportunity's CreatedById (the record creator).
     * @param newOpportunities List of newly inserted Opportunity records
     */
    public static void createTasksForNewOpportunities(List<Opportunity> newOpportunities) {
        if (newOpportunities == null || newOpportunities.isEmpty()) {
            return;
        }

        List<Task> tasksToInsert = new List<Task>();

        for (Opportunity opp : newOpportunities) {
            Task t = new Task();
            t.Subject        = 'Follow up on Opportunity: ' + opp.Name;
            t.WhatId         = opp.Id;
            t.OwnerId        = opp.CreatedById;
            t.Status         = 'Not Started';
            t.Priority       = 'Normal';
            t.ActivityDate   = Date.today().addDays(7);
            t.Description    = 'Auto-generated task. Review and progress this opportunity.';
            tasksToInsert.add(t);
        }

        if (!tasksToInsert.isEmpty()) {
            try {
                insert tasksToInsert;
            } catch (DmlException e) {
                throw new AuraHandledException(
                    'OpportunityTriggerHandler: Failed to create Tasks — ' + e.getMessage()
                );
            }
        }
    }
}