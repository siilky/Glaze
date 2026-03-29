<script setup>
defineProps({
    text: {
        type: String,
        default: ''
    }
});
defineEmits(['click']);
</script>

<template>
    <div class="fab-add" @click="$emit('click')">
        <slot name="icon"></slot>
        <Transition name="fab-text">
            <div :key="text" class="fab-content" v-if="text">
                <span class="fab-text-inner">{{ text }}</span>
            </div>
        </Transition>
    </div>
</template>