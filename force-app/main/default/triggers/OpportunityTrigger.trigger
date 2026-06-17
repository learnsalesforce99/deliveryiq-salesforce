/**
 * @description Trigger on Opportunity to handle automation events.
 * @author DeliveryIQ Build Agent
 * @jira SCRUM-17
 * @date 2026-06-17
 */
trigger OpportunityTrigger on Opportunity (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        OpportunityTriggerHandler.createTasksForNewOpportunities(Trigger.new);
    }
}