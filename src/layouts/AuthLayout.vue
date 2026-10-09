<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view v-slot="{ Component, route: viewRoute }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="viewRoute.path" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup></script>
