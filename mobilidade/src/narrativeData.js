import narrativeText from './narrative.md?raw';
import { parseNarrative } from './narrativeParser';
import { narrativeMappings } from './narrativeMappings';

const parsedItems = parseNarrative(narrativeText);

export const narrativeData = {
    prologue: {
        title: "O DIA NASCE, NÓS AINDA NÃO",
        text: "São cinco da manhã, o dia ainda nem começou direito, mas o sol, sempre apressado no Recife, já se espalha como se houvesse um para cada habitante da cidade. O corpo sente o peso de ontem, mas a rotina não espera, não pede licença, não pergunta se você está pronto. Apenas segue. "
    },
    title: {
        text: "O Preço da Mobilidade"
    },
    items: parsedItems.map(item => {
        if (item.type === 'card' && narrativeMappings[item.id]) {
            item.triggerAfter = narrativeMappings[item.id];
        }
        return item;
    })
};
