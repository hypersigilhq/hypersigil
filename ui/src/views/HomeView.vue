<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-muted-foreground">
        Welcome to your Vue TypeScript application with shadcn-vue components.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Users</CardTitle>
          <User class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">2,350</div>
          <p class="text-xs text-muted-foreground">+20.1% from last month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Revenue</CardTitle>
          <DollarSign class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">$45,231.89</div>
          <p class="text-xs text-muted-foreground">+20.1% from last month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Sales</CardTitle>
          <CreditCard class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">+12,234</div>
          <p class="text-xs text-muted-foreground">+19% from last month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Now</CardTitle>
          <Activity class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">+573</div>
          <p class="text-xs text-muted-foreground">+201 since last hour</p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card class="col-span-4">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent class="pl-2">
          <div class="h-[200px] flex items-center justify-center text-muted-foreground">
            Chart placeholder - integrate with your preferred charting library
          </div>
        </CardContent>
      </Card>

      <Card class="col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>You have 3 new notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center">
              <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <div class="flex-1 space-y-1">
                <p class="text-sm font-medium leading-none">New user registered</p>
                <p class="text-sm text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div class="flex-1 space-y-1">
                <p class="text-sm font-medium leading-none">Payment received</p>
                <p class="text-sm text-muted-foreground">5 minutes ago</p>
              </div>
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              <div class="flex-1 space-y-1">
                <p class="text-sm font-medium leading-none">System update completed</p>
                <p class="text-sm text-muted-foreground">10 minutes ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, CreditCard, DollarSign, User } from 'lucide-vue-next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
</script>
