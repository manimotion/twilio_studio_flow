const axios = require('axios');

async function validateFlow(flow) {
    const menuDigits = new Set();
    const subMenuDigits = new Set();
    const validatedMusicLinks = new Set();

    for (const state of flow.states) {
        if (state.type === 'say-play' && state.properties.play && state.properties.play.endsWith('.mp3')) {
            if (!validatedMusicLinks.has(state.properties.play)) {
                try {
                    await validateMusicPlayUrl(state.properties.play);
                    validatedMusicLinks.add(state.properties.play); // Agregar el enlace validado al conjunto
                } catch (error) {
                    console.error(`Error validating the music playback link in state '${state.name}':`, error.message);
                }
            }
        }

        if (state.type === 'split-based-on') {
            const input = state.properties.input;
            const type = input === "{{widgets.menu.Digits}}" ? 'menu' : 'submenu';

            for (const transition of state.transitions) {
                if (transition.event === 'match' && transition.conditions) {
                    for (const condition of transition.conditions) {
                        if (condition.type === 'equal_to') {
                            const value = condition.value;
                            const digits = type === 'menu' ? value : value + '_submenu';

                            if (type === 'menu') {
                                if (menuDigits.has(digits)) {
                                    throw new Error(`The menu digit '${value}' is repeated.`);
                                }
                                menuDigits.add(digits);
                            } else {
                                if (subMenuDigits.has(digits)) {
                                    throw new Error(`The submenu digit '${value}' is repeated.`);
                                }
                                subMenuDigits.add(digits);
                            }
                        }
                    }
                }
            }
        }
    }
    console.log('No duplicate numbers found in the flow. Validation successful.');
}

async function validateMusicPlayUrl(playUrl) {
    try {
        const response = await axios.head(playUrl);
        if (response.status !== 200) {
            throw new Error(`Received status code ${response.status} while validating music playback link.`);
        }
        console.log(`Validation of the music playback link '${playUrl}' completed successfully.`);
        return true;
    } catch (error) {
        console.error(`Error validating the music playback link '${playUrl}':`, error.message);
        throw error;
    }
}

module.exports = {
    validateFlow,
    validateMusicPlayUrl
};
