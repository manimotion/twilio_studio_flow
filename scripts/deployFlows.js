const { isEqual } = require('lodash');
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const client = require('twilio')("ACc95242245a1113277ae1f3c17cef330b", "46fa6ee9dd05bac331117749ae4c45e1");
const { validateFlow } = require('./flowValidator.js');
const friendlyName = 'Ivr_call_env1.json';
const colors = require('colors');

async function compareFlows(currentFlow, existingFlow) {
    const lines = [];
    Object.keys(currentFlow).forEach(key => {
        const currentKeys = Object.keys(currentFlow[key].properties);
        const existingKeys = Object.keys(existingFlow[key].properties);
        currentKeys.forEach(propKey => {
            if (!isEqual(currentFlow[key].properties[propKey], existingFlow[key].properties[propKey])) {
                lines.push({
                    key,
                    propKey,
                    current: currentFlow[key].properties[propKey],
                    existing: existingFlow[key].properties[propKey]
                });
            }
        });
    });
    return lines;
}

async function promptUserConfirmation() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve, reject) => {
        rl.question('Changes detected in the flow. Do you want to continue with deployment? (y/n): ', (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y') {
                resolve(true); // User wants to continue
            } else {
                resolve(false); // User wants to cancel
            }
        });
    });
}

async function run() {
    const flowFilePath = path.resolve(__dirname, '../flows/Ivr_call_env1.json');
    const currentFlow = JSON.parse(await fs.readFile(flowFilePath, 'utf8'));

    try {
        await validateFlow(currentFlow);
    } catch (err) {
        console.error('Flow validation error:', err.message);
        return;
    }

    let existingFlow;
    try {
        const allFlows = await client.studio.flows.list();
        existingFlow = allFlows.find(flow => flow.friendlyName === friendlyName);
    } catch (err) {
        console.error('Error getting existing flow from Twilio:', err);
        return;
    }

    if (!existingFlow) {
        try {
            const newFlow = await client.studio.flows.create({
                definition: currentFlow,
                friendlyName,
                status: 'published',
            });
            console.log('New flow created:', newFlow.webhookUrl);
        } catch (err) {
            console.error('Error creating a new flow in Twilio:', err);
        }
        return;
    }

    let existingFlowDefinition;
    try {
        const { definition } = await client.studio.flows(existingFlow.sid).fetch();
        existingFlowDefinition = definition;
    } catch (err) {
        console.error('Error getting existing flow definition from Twilio:', err);
        return;
    }

    const changedLines = await compareFlows(currentFlow.states, existingFlowDefinition.states);

    if (changedLines.length === 0) {
        console.log('No changes detected in the flow.');
        return;
    }

    console.log('Changes detected in the flow:');
    changedLines.forEach(line => {
        console.log(colors.bgMagenta(`Line ${line.key}:`));
        console.log(colors.green('New state:'), JSON.stringify(line.current, null, 2));
        console.log(colors.green('Current state:'), JSON.stringify(line.existing, null, 2));
        console.log('---');
    });

    const continueDeployment = await promptUserConfirmation();
    if (!continueDeployment) {
        console.log('Deployment canceled by the user.');
        return;
    }

    try {
        const updatedFlow = await client.studio.flows(existingFlow.sid).update({
            definition: currentFlow,
            status: 'published',
            commitMessage: 'Automated deployment',
        });
        console.log('Flow updated in Twilio:', updatedFlow.webhookUrl);
    } catch (err) {
        console.error('Error updating flow in Twilio:', err);
    }
}

run().catch(console.error);
