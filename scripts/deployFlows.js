const { isEqual } = require('lodash');
const path = require('path');
const fs = require('fs').promises
const client = require('twilio')("ACa80d44fb06c27c533a0e9f002e1a689e", "c9c3dd9845310bf965826a8f0e4fd1c3");
const friendlyName = 'Ivr_call_env1.json'

async function run() {
    const flowFilePath = path.resolve(__dirname, '../flows/Ivr_call_env1.json');
    const flow = JSON.parse(await fs.readFile(flowFilePath, 'utf8'));

    try {
        await client.studio.flowValidate.update({
            friendlyName,
            definition: flow,
            status: 'published',
        }
        )
    } catch (err) {
        console.error('invalid flow');
        console.dir(err.details);
    }

    const allFlows = await client.studio.flows.list();
  const existingFlow = allFlows.find(
    (flow) => flow.friendlyName === friendlyName
  );

  if (!existingFlow) {
    const newFlow = await client.studio.flows.create({
      definition: flow,
      friendlyName,
      status: 'published',
    });
    console.log('New Flow', newFlow.webhookUrl);
    return;
  }

  const { definition } = await client.studio.flows(existingFlow.sid).fetch();
  if (isEqual(definition, flow)) {
    console.log('No changes');
    return;
  }

  const updatedFlow = await client.studio.flows(existingFlow.sid).update({
    definition: flow,
    status: 'published',
    commitMessage: 'Automated deployment',
  });
  console.log('Updated flow', updatedFlow.webhookUrl);
}

run().catch(console.error);