<script lang="ts">
import { useApi, useStores } from '@directus/extensions-sdk';
import { defineComponent, onMounted, onUpdated, onBeforeUnmount, onUnmounted, ref, computed, watch, CSSProperties } from 'vue';
import { useAutoFontFit } from './composables/use-auto-fit-text';
import { formatNumber } from './utils/format-number';
import type { Style, Notation, Unit } from './utils/format-number';
import { get, isNil } from 'lodash';
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

// interface Props {
// 	filters: string | null;
// 	fields: string | null;
// 	expression: string | null;
// 	showHeader?: boolean;
// 	notation?: Notation;
// 	numberStyle?: Style;
// 	unit?: Unit;
// 	prefix?: string | null;
// 	suffix?: string | null;
// 	minimumFractionDigits?: number;
// 	maximumFractionDigits?: number;
// 	conditionalFormatting?: Record<string, any>[] | null;
// 	textAlign?: CSSProperties['text-align'];
// 	fontSize?: string;
// 	fontWeight?: number | undefined;
// 	fontStyle?: string | undefined;
// 	font?: 'sans-serif' | 'serif' | 'monospace';
// }

// /*
// 	Converts to {type, default} form
//  */
// function getPropsData(props) {
// 	return Object.entries(props).reduce((acc, [key, value]) => {
// 		if (typeof value === 'object' && !Array.isArray(value)) {
// 			acc[key] = { type: Object, default: () => value };
// 		} else if (typeof value === 'string') {
// 			acc[key] = { type: String, default: value };
// 		} else if (typeof value === 'number') {
// 			acc[key] = { type: Number, default: value };
// 		} else if (typeof value === 'boolean') {
// 			acc[key] = { type: Boolean, default: value };
// 		} else {
// 			acc[key] = { type: null, default: value };
// 		}
// 		return acc;
// 	}, {});
// }

export default defineComponent({ 
	// props: withDefaults(defineProps<Props>(), {
	// 	filters: null,
	// 	fields: null,
	// 	expression: null,
	// 	showHeader: false,
	// 	notation: 'standard',
	// 	numberStyle: 'decimal',
	// 	unit: undefined,
	// 	prefix: '',
	// 	suffix: '',
	// 	minimumFractionDigits: 0,
	// 	maximumFractionDigits: 0,
	// 	conditionalFormatting: () => [],
	// 	fontSize: 'auto',
	// 	fontWeight: 800,
	// 	font: 'sans-serif',
	// 	textAlign: 'center',
	// }),
	props: {
		filters: {
			type: String,
			default: null,
		},
		fields: {
			type: String,
			default: null,
		},
		expression: {
			type: String,
			default: null,
		},
		showHeader: {
			type: Boolean,
			default: false,
		},
		notation: {
			type: String as () => Notation,
			default: 'standard',
		},
		numberStyle: {
			type: String as () => Style,
			default: 'decimal',
		},
		unit: {
			type: String as () => Unit,
			default: undefined,
		},
		prefix: {
			type: String,
			default: '',
		},
		suffix: {
			type: String,
			default: '',
		},
		minimumFractionDigits: {
			type: Number,
			default: 0,
		},
		maximumFractionDigits: {
			type: Number,
			default: 0,
		},
		conditionalFormatting: {
			type: Array as () => Record<string, any>[],
			default: () => [],
		},
		textAlign: {
			type: String as () => CSSProperties['text-align'],
			default: 'center',
		},
		fontSize: {
			type: String,
			default: 'auto',
		},
		fontWeight: {
			type: [Number, String],
			default: 800,
		},
		fontStyle: {
			type: String,
			default: undefined,
		},
		font: {
			type: String as () => 'sans-serif' | 'serif' | 'monospace',
			default: 'sans-serif',
		},
	},
	setup(props) {
		const { t, n, locale } = useI18n();
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

		const calculatedPanelContainer = ref<HTMLDivElement | null>(null);
		const calculatedPanelText = ref<HTMLParagraphElement | null>(null);

		const { adjustFontSize } = useAutoFontFit(calculatedPanelContainer, calculatedPanelText);

		let resizeObserver: ResizeObserver | null = null;

		onMounted(() => {
			loadCalculatedPanel();
			updateFit();
		});

		watch([
			() => props.filters,
			() => props.fields,
			() => props.expression
		], () => {
			loadCalculatedPanel();
		});

		onUpdated(() => {
			updateFit();
		})

		onBeforeUnmount(() => {
			unmountResizeObserver();
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
						filter: JSON.parse(props.filters)[collectionName] || {}, 
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

		function adjustPadding() {
			const container = calculatedPanelContainer.value;
			if (!container) return;

			const paddingWidth = container.offsetWidth * 0.05;
			const paddingHeight = container.offsetHeight * 0.05;

			const padding = Math.round(Math.max(8, Math.min(paddingWidth, paddingHeight)));

			if (props.showHeader == true) {
				container.style.padding = '0px 12px 12px 12px';
			} else {
				container.style.padding = `${padding}px`;
			}

			return;
		}

		function unmountResizeObserver() {
			if (resizeObserver) {
				resizeObserver.disconnect();
				resizeObserver = null;
			}
		}

		async function updateFit() {
			if (props.fontSize !== 'auto' || !props.data || props.data.length === 0) {
				unmountResizeObserver();
				return;
			}

			await document.fonts.ready;
			adjustPadding();
			adjustFontSize();

			if (!resizeObserver) {
				const container = calculatedPanelContainer.value;
				if (!container) return;

				// Create a ResizeObserver to watch for changes in the container's dimensions
				resizeObserver = new ResizeObserver(() => {
					updateFit();
				});

				resizeObserver.observe(container);
			}

			adjustFontSize();
		}

		const color = computed(() => {
			return 'red'; //TODO fix
			/*console.log(`--> In color (computed): calculatedPanel.value.result = ${calculatedPanel.value.result}`);
			if (isNil(calculatedPanel.value.result)) return null;

			let matchingFormat = null;

			for (const format of props.conditionalFormatting || []) {
				if (matchesOperator(format)) {
					matchingFormat = format;
				}
			}

			return matchingFormat?.color || 'var(--theme--primary)';

			function matchesOperator(format: Record<string, any>) {
				console.log(`In matchesOperator: calculatedPanel.value.result = ${calculatedPanel.value.result}`);
				if (typeof calculatedPanel.value.result === 'string') {
					const value = calculatedPanel.value.result;
					const compareValue = format.value ?? '';

					switch (format.operator || '>=') {
						case '=':
							return value === compareValue;
						case '!=':
							return value !== compareValue;
					}
				} else {
					const value = Number(calculatedPanel.value.result);
					const compareValue = Number(format.value ?? 0);

					switch (format.operator || '>=') {
						case '=':
							return value === compareValue;
						case '!=':
							return value !== compareValue;
						case '>':
							return value > compareValue;
						case '>=':
							return value >= compareValue;
						case '<':
							return value < compareValue;
						case '<=':
							return value < compareValue;
					}
				}

				return false;
			}*/
		});

		return {
			t,
			isLoading,
			//calculatedPanelEl,
			calculatedPanel,
			calculatedPanelContainer,
			calculatedPanelText,

			displayValue(value: string) {
				if (value === null || value === undefined) {
					return '[N/A]';
				}
				const valueNumber = Number(value);
				if (isNaN(valueNumber)) {
					return value;
				} else {
					return formatNumber(valueNumber, locale.value, {
						notation: props.notation,
						style: props.numberStyle,
						unit: props.unit,
						minimumFractionDigits: props.minimumFractionDigits,
						maximumFractionDigits: props.maximumFractionDigits,
						currency: props.numberStyle === 'currency' ? String(props.unit) : undefined,
					});
				}
			},
			color,

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
			ref="calculatedPanelText"
			class="calculated-panel-text"
			:style="{ color, fontWeight, textAlign, fontStyle, fontSize: fontSize !== 'auto' ? fontSize : undefined }"
		>
			{{ prefix }}
			{{ displayValue(calculatedPanel.result) }}
			{{ suffix }}
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
