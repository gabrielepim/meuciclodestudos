/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as AppRouteImport } from './routes/_app'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AppGamificationRouteImport } from './routes/_app.gamification'
import { Route as AppExportRouteImport } from './routes/_app.export'
import { Route as AppExamQuestionsRouteImport } from './routes/_app.exam-questions'
import { Route as AppErrorsRouteImport } from './routes/_app.errors'
import { Route as AppEditorialRouteImport } from './routes/_app.editorial'
import { Route as AppDashboardRouteImport } from './routes/_app.dashboard'
import { Route as AppCycleRouteImport } from './routes/_app.cycle'
import { Route as AppArgumentsRouteImport } from './routes/_app.arguments'
import { Route as AppDiscursivasRouteImport } from './routes/_app.discursivas'
import { Route as AppMateriaisRouteImport } from './routes/_app.materiais'

const AppRoute = AppRouteImport.update({
  id: '/_app',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AppGamificationRoute = AppGamificationRouteImport.update({
  id: '/gamification',
  path: '/gamification',
  getParentRoute: () => AppRoute,
} as any)
const AppExportRoute = AppExportRouteImport.update({
  id: '/export',
  path: '/export',
  getParentRoute: () => AppRoute,
} as any)
const AppExamQuestionsRoute = AppExamQuestionsRouteImport.update({
  id: '/exam-questions',
  path: '/exam-questions',
  getParentRoute: () => AppRoute,
} as any)
const AppErrorsRoute = AppErrorsRouteImport.update({
  id: '/errors',
  path: '/errors',
  getParentRoute: () => AppRoute,
} as any)
const AppEditorialRoute = AppEditorialRouteImport.update({
  id: '/editorial',
  path: '/editorial',
  getParentRoute: () => AppRoute,
} as any)
const AppDashboardRoute = AppDashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => AppRoute,
} as any)
const AppCycleRoute = AppCycleRouteImport.update({
  id: '/cycle',
  path: '/cycle',
  getParentRoute: () => AppRoute,
} as any)
const AppArgumentsRoute = AppArgumentsRouteImport.update({
  id: '/arguments',
  path: '/arguments',
  getParentRoute: () => AppRoute,
} as any)
const AppDiscursivasRoute = AppDiscursivasRouteImport.update({
  id: '/discursivas',
  path: '/discursivas',
  getParentRoute: () => AppRoute,
} as any)
const AppMateriaisRoute = AppMateriaisRouteImport.update({
  id: '/materiais',
  path: '/materiais',
  getParentRoute: () => AppRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/arguments': typeof AppArgumentsRoute
  '/cycle': typeof AppCycleRoute
  '/dashboard': typeof AppDashboardRoute
  '/editorial': typeof AppEditorialRoute
  '/errors': typeof AppErrorsRoute
  '/exam-questions': typeof AppExamQuestionsRoute
  '/export': typeof AppExportRoute
  '/gamification': typeof AppGamificationRoute
  '/discursivas': typeof AppDiscursivasRoute
  '/materiais': typeof AppMateriaisRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/arguments': typeof AppArgumentsRoute
  '/cycle': typeof AppCycleRoute
  '/dashboard': typeof AppDashboardRoute
  '/editorial': typeof AppEditorialRoute
  '/errors': typeof AppErrorsRoute
  '/exam-questions': typeof AppExamQuestionsRoute
  '/export': typeof AppExportRoute
  '/gamification': typeof AppGamificationRoute
  '/discursivas': typeof AppDiscursivasRoute
  '/materiais': typeof AppMateriaisRoute
}

export interface FileRoutesById {
  '__root__': typeof rootRouteImport
  '/_app': typeof AppRoute
  '/': typeof IndexRoute
  '/_app/arguments': typeof AppArgumentsRoute
  '/_app/cycle': typeof AppCycleRoute
  '/_app/dashboard': typeof AppDashboardRoute
  '/_app/editorial': typeof AppEditorialRoute
  '/_app/errors': typeof AppErrorsRoute
  '/_app/exam-questions': typeof AppExamQuestionsRoute
  '/_app/export': typeof AppExportRoute
  '/_app/gamification': typeof AppGamificationRoute
  '/_app/discursivas': typeof AppDiscursivasRoute
  '/_app/materiais': typeof AppMateriaisRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fileRoutesByTo: FileRoutesByTo
  fileRoutesById: FileRoutesById
}

interface AppRouteChildren {
  AppArgumentsRoute: typeof AppArgumentsRoute
  AppCycleRoute: typeof AppCycleRoute
  AppDashboardRoute: typeof AppDashboardRoute
  AppEditorialRoute: typeof AppEditorialRoute
  AppErrorsRoute: typeof AppErrorsRoute
  AppExamQuestionsRoute: typeof AppExamQuestionsRoute
  AppExportRoute: typeof AppExportRoute
  AppGamificationRoute: typeof AppGamificationRoute
  AppDiscursivasRoute: typeof AppDiscursivasRoute
  AppMateriaisRoute: typeof AppMateriaisRoute
}

const AppRouteChildren: AppRouteChildren = {
  AppArgumentsRoute: AppArgumentsRoute,
  AppCycleRoute: AppCycleRoute,
  AppDashboardRoute: AppDashboardRoute,
  AppEditorialRoute: AppEditorialRoute,
  AppErrorsRoute: AppErrorsRoute,
  AppExamQuestionsRoute: AppExamQuestionsRoute,
  AppExportRoute: AppExportRoute,
  AppGamificationRoute: AppGamificationRoute,
  AppDiscursivasRoute: AppDiscursivasRoute,
  AppMateriaisRoute: AppMateriaisRoute,
}

const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren)

interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AppRoute: typeof AppRouteWithChildren
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AppRoute: AppRouteWithChildren,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
