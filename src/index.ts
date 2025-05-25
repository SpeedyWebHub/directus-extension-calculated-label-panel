import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
	id: 'panel-calculated',
	name: 'Calculated Panel',
	icon: 'box',
	description: 'This is a flexible panel that can display calculated values.',
	component: PanelComponent,
	options: [
		{
			field: 'text',
			name: 'Text',
			type: 'string',
			meta: {
				interface: 'input',
				width: 'full',
			},
		},
		{
			field: 'field',
			type: 'string',
			name: '$t:panels.metric.field',
			meta: {
				interface: 'system-field',
				// options: {
				// 	collectionField: 'collection',
				// 	allowPrimaryKey: true,
				// 	allowNone: true,
				// },
				width: 'half',
			},
		},
		{
			field: 'filter',
			type: 'json',
			name: '$t:filter',
			meta: {
				interface: 'system-filter',
				// options: {
				// 	collectionField: 'collection',
				// 	relationalFieldSelectable: false,
				// },
			},
		}
	],
	minWidth: 12,
	minHeight: 8,
});
