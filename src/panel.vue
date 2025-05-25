<script lang="ts">
import { useApi, useStores } from '@directus/extensions-sdk';
import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		showHeader: {
			type: Boolean,
			default: false,
		},
		text: {
			type: String,
			default: '',
		},
	},
	setup(props) {
		const { t, n } = useI18n();
		const api = useApi();
		const { useFieldsStore, usePermissionsStore } = useStores();
		const { hasPermission } = usePermissionsStore();
		//const canRead = hasPermission(props.collection, 'read');
		const canRead = true; // For demonstration purposes, assuming read permission is always true TODO
		const hasError = ref<boolean>(false);

		const errorResponse = ref<Record<string, string>>({
			title: '',
			message: '',
		});

		const isLoading = ref<boolean>(true);

		const fieldsStore = useFieldsStore();
		const calculatedPanelEl = ref();
		const calculatedPanel = ref({ result: '666' });

		console.log("--> Calling onMounted");
		onMounted(setUpCalculatedPanel);

		watch([

		], () => {
			//TODO cleanup
			setUpCalculatedPanel();
		});

		onUnmounted(() => {
			//TODO cleanup
		});
		
		//////
		async function setUpCalculatedPanel() {
			console.log('--> In setUpCalculatedPanel');
			calculatedPanel.value.result = '777';
		}

		return {
			t,
			isLoading,
			calculatedPanelEl,
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
		//////
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
			{{ displayValue(calculatedPanel.value.result) }}
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
