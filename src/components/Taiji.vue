<template>
  <div
      class="taiji-container"
      :style="{
      '--size': `${size}px`,
      '--primary-color': primaryColor,
      '--secondary-color': secondaryColor,
      '--duration': `${duration}s`
    }"
  >
    <div class="square">
      <div class="rect rect-one">
        <div class="inner-circle rect-one-one">
          <div class="dot rect-one-two"></div>
        </div>
      </div>
      <div class="rect rect-two">
        <div class="inner-circle rect-two-one">
          <div class="dot rect-two-two"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Taiji',
  props: {
    size: {
      type: Number,
      default: 400
    },
    primaryColor: {
      type: String,
      default: '#000'
    },
    secondaryColor: {
      type: String,
      default: '#fff'
    },
    duration: {
      type: Number,
      default: 5
    }
  }
})
</script>

<style scoped>
.taiji-container {
  --size: 400px;
  --primary-color: #000;
  --secondary-color: #fff;
  --duration: 5s;

  display: inline-block;
  margin-left: calc(var(--size) / -2);
}

.square {
  width: var(--size);
  height: var(--size);
  position: relative;
  transform: rotate(45deg);
  animation: rotate infinite linear var(--duration);
  top:25%;
  left: 40%;
}

.rect {
  width: var(--size);
  height: calc(var(--size) / 2);
  position: relative;
  border-bottom: none;
}

.inner-circle {
  width: calc(var(--size) / 2);
  height: calc(var(--size) / 2);
  border-radius: 50%;
  position: absolute;
  z-index: 1;
}

.dot {
  width: calc(var(--size) / 8);
  height: calc(var(--size) / 8);
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  border-radius: 50%;
}

.rect-one {
  border-radius: calc(var(--size) / 2) calc(var(--size) / 2) 0 0;
  background: var(--secondary-color);
}

.rect-one-one {
  bottom: calc(var(--size) / -4);
  left: 0;
  background: var(--primary-color);
}

.rect-one-two {
  background: var(--secondary-color);
}

.rect-two {
  border-radius: 0 0 calc(var(--size) / 2) calc(var(--size) / 2);
  background: var(--primary-color);
}

.rect-two-one {
  bottom: calc(var(--size) / 4);
  right: 0;
  background: var(--secondary-color);
}

.rect-two-two {
  background: var(--primary-color);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
