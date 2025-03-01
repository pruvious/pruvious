<template>
  <div class="p-wrapper">
    <slot />
  </div>
</template>

<style>
body {
  --pui-dialog-size: -1;
  --pui-toast-size: -1;
  --pui-tooltip-size: -1;
}
</style>

<style scoped>
.p-wrapper {
  --pui-size: -1;
  --pui-spacing: -1;
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 100dvh;
  transition: var(--pui-transition);
  transition-property: opacity filter transform;
  transition-duration: var(--pui-overlay-transition-duration);
}

.pui-overlay-active .p-wrapper {
  opacity: 0.36;
  filter: blur(1px);
  transform: scale(0.97);
}

.p-wrapper::before,
.p-wrapper::after {
  content: '';
  display: block;
  width: 1px;
  background-color: hsl(var(--pui-border));
}
</style>
