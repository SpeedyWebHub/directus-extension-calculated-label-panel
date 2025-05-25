import { definePanel } from '@directus/extensions-sdk';
import CalculatedPanelComponent from './calculated-panel.vue';

export default definePanel({
	id: 'panel-calculated',
	name: 'Calculated Panel',
	icon: 'box',
	description: 'This is a flexible panel that can display calculated values.',
	component: CalculatedPanelComponent,
	options: [
		{
			field: 'field',
			name: '$t:panels.metric.field',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'full',
			},
		},
		{
			field: 'filter',
			name: '$t:filter',
			type: 'json',
			meta: {
				interface: 'input',
				width: 'full',
			},
		}
	],
	minWidth: 12,
	minHeight: 8,
});
