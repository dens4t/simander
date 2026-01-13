<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  try {
    await authStore.checkAuth()
  } catch (err) {
    console.warn('Auth check failed:', err)
  }
})
</script>
