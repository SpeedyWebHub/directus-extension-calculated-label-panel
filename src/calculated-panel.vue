<script lang="ts">
import { useApi, useStores } from '@directus/extensions-sdk';
import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { get } from 'lodash';
import { useI18n } from 'vue-i18n';
import { create, all } from 'mathjs';

const math = create(all);
math.import({
  sum: arr => arr.map(x=>Number(x)).filter(x=>!isNaN(x)).reduce((a, b) => a + b, 0),
  avg: arr => arr.map(x=>Number(x)).filter(x=>!isNaN(x)).reduce((a, b) => a + b, 0) / arr.length,
	count: arr => arr.length,
	attr: (arr, key) => arr.map(obj => obj[key]),
	max: arr => Math.max(...arr.map(x=>Number(x)).filter(x=>!isNaN(x))),
	min: arr => Math.min(...arr.map(x=>Number(x)).filter(x=>!isNaN(x))),
	median: arr => {
		const sorted = arr.map(x=>Number(x)).filter(x=>!isNaN(x)).slice().sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	},
	round: (value, precision = 0) => {
		const factor = Math.pow(10, precision);
		return Math.round(value * factor) / factor;
	},
	ceil: (value, precision = 0) => {
		const factor = Math.pow(10, precision);
		return Math.ceil(value * factor) / factor;
	},
	floor: (value, precision = 0) => {
		const factor = Math.pow(10, precision);
		return Math.floor(value * factor) / factor;
	},
	abs: value => Math.abs(value),
}, { override: true });

export default defineComponent({
	props: {
		showHeader: {
			type: Boolean,
			default: false,
		},
		filter: {
			type: Object,
			default: {},
		},
		fields: {
			type: String,
			default: null,
		},
		expression: {
			type: String,
			default: null,
		}
	},
	setup(props) {
		const { t, n } = useI18n();
		const api = useApi();
		const { useFieldsStore, usePermissionsStore } = useStores();
		const { hasPermission } = usePermissionsStore();
		const canRead = getOperands(props).every(x => hasPermission(x.collectionName, 'read'));
		const hasError = ref<boolean>(false);

		const errorResponse = ref<Record<string, string>>({
			title: '',
			message: '',
		});

		const isLoading = ref<boolean>(true);

		//const fieldsStore = useFieldsStore();
		//const calculatedPanelEl = ref();
		const calculatedPanel = ref({ result: 'Calculating...' });

		onMounted(loadCalculatedPanel);

		watch([
			() => props.filter,
			() => props.fields,
			() => props.expression
		], () => {
			loadCalculatedPanel();
		});

		onUnmounted(() => {
		});

		function getOperands(props) {
			return props.fields ? props.fields.split(',').map(x => (()=>{const p=x.trim().split('.'); return {collectionName: p[0] ?? 'unknown', fieldName: p[1] ?? 'unknown'}})()) : [];
		}

		function sanitizeOperands(operands) {
			for (let i = 0; i < operands.length; i++) {
				operands[i].collectionName = operands[i].collectionName.replace(/[^0-9a-zA-Z_-]/g, '');
				operands[i].fieldName = operands[i].fieldName.replace(/[^0-9a-zA-Z_-]/g, '');
			}
		}
		
		async function loadCalculatedPanel() {
			console.log('--> In loadCalculatedPanel');
			console.log('Calling getOperands')
			const operands = getOperands(props);
			console.log('Calling sanitizeOperands');
			sanitizeOperands(operands);
			console.log('Setting uniqueCollectionNames');
			const uniqueCollectionNames = [...new Set(operands.map(x => x.collectionName))];
			const collectionsLookup = {};
			console.log('Iterating over collections');
			for (const collectionName of uniqueCollectionNames) {
				console.log(`--> Processing collection ${collectionName}`);
				const data = [];
				const uniqueFieldNames = [...new Set(operands.filter(x => x.collectionName === collectionName).map(x => x.fieldName))];
				const response = await api.get(`/items/${collectionName}`, {
					params: {
						limit: '-1',
						fields: uniqueFieldNames,
						filter: props.filter
					},
				});
				console.log('--> Setting field data');
				response.data.data.forEach((item: Record<string, any>) => {
					const itemData = {};
					uniqueFieldNames.forEach(fieldName => {
						itemData[fieldName] = get(item, fieldName, null);
					});
					data.push(itemData);
				});
				collectionsLookup[collectionName] = data;
			}

			console.log('--> Evaluating expression');
			const output = math.evaluate(props.expression, collectionsLookup);
			console.log(`props.expression = ${props.expression}`);
			console.log(`collectionsLookup = ${JSON.stringify(collectionsLookup)}`);
			console.log(`output = ${output}`);
			console.log('--> Setting output');
			const outputNumber = Number(output);
			calculatedPanel.value.result = isNaN(outputNumber) ? output : outputNumber.toFixed(2);
		}

		return {
			t,
			isLoading,
			//calculatedPanelEl,
			calculatedPanel,

			displayValue(value: string) {
				if (value === null || value === undefined) {
					return '[N/A]';
				}
				return value;
			},

			// Errors
			hasError,
			errorResponse,

			// Permission
			canRead,

		};
	},
});
</script>

<template>
	<div ref="calculatedPanelContainer" class="calculated-panel type-title selectable" :class="[font, { 'has-header': showHeader }]">
		<p
			ref="labelText"
			class="calculated-panel-text"
			:style="{ color, fontWeight, textAlign, fontStyle, fontSize: fontSize !== 'auto' ? fontSize : undefined }"
		>
			{{ displayValue(calculatedPanel.result) }}
		</p>
	</div>
</template>

<style lang="scss" scoped>
.calculated-panel-text {
	min-width: min-content;
	min-height: min-content;
	width: 100%;
}
.calculated-panel {
	display: flex;
	align-items: center;
	width: 100%;
	height: 100%;
	font-weight: 800;
	white-space: nowrap;
	line-height: 1.2;
	padding: 12px;

	&.sans-serif {
		font-family: var(--theme--fonts--sans--font-family);
	}

	&.serif {
		font-family: var(--theme--fonts--serif--font-family);
	}

	&.monospace {
		font-family: var(--theme--fonts--monospace--font-family);
	}
}
</style>
