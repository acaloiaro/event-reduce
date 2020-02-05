import {
    StateSet,
    ActionName,
    ChangeEvent
} from '../types';
import {
    orderedActionList
} from '../actions';
import {
    testResults
} from './test-results';
import {
    getQueryVariations
} from './queries';
import { isStateSetReachable } from './binary-state';
import { MongoQuery, Human } from './types';
import { getTestProcedures } from './test-procedures';

/**
 * calculates the best action for a given StateSet
 * It does that by itteration over the actions and using testResults()
 * to find if that action fits the 'real' query-results
 */
export async function calculateActionForState(
    stateSet: StateSet,
    queries: MongoQuery[] = getQueryVariations(),
    procedures?: ChangeEvent<Human>[][],
    showLogs: boolean = false
): Promise<ActionName> {
    if (!isStateSetReachable(stateSet)) {
        return 'unknownAction';
    }
    procedures = procedures ? procedures : await getTestProcedures();
    for (let i = 0; i < orderedActionList.length; i++) {
        const action: ActionName = orderedActionList[i];
        const stateSetToActionMap = new Map();
        stateSetToActionMap.set(stateSet, action);

        let broken = false;
        for (let t = 0; t < procedures.length; t++) {
            const useChangeEvents = procedures[t];
            const valid = await testResults(
                queries,
                stateSetToActionMap,
                useChangeEvents,
                showLogs
            );
            if (!valid.correct) {
                broken = true;
                break;
            }
        }
        if (!broken) {
            return action;
        }
    }

    console.error('calculateActionForState(): Fatal error on state ' + stateSet);
    console.error('it looks like event "runFullQueryAgain" did not return the correct results');

    throw new Error('this should not happen');
}