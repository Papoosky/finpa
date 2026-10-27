import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
} from "@tanstack/react-router";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TransactionFormPage } from "./pages/TransactionFormPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { SubscriptionFormPage } from "./pages/SubscriptionFormPage";

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <div className="card p-10 text-center">
      <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
        Esta página no existe
      </h1>
      <p className="mt-2 text-slate-500">Volvamos a tu resumen financiero.</p>
      <Link to="/" className="button-primary mt-6">
        Ir al resumen
      </Link>
    </div>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});
const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: TransactionsPage,
});
const newTransactionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions/new",
  component: TransactionFormPage,
});
const transactionEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions/$transactionId/edit",
  component: EditTransactionRoute,
});
const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});
const newSubscriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscriptions/new",
  component: SubscriptionFormPage,
});
const subscriptionEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscriptions/$subscriptionId/edit",
  component: EditSubscriptionRoute,
});

function EditTransactionRoute() {
  const { transactionId } = transactionEditRoute.useParams();
  return <TransactionFormPage transactionId={transactionId} />;
}

function EditSubscriptionRoute() {
  const { subscriptionId } = subscriptionEditRoute.useParams();
  return <SubscriptionFormPage subscriptionId={subscriptionId} />;
}

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  newTransactionRoute,
  transactionEditRoute,
  subscriptionsRoute,
  newSubscriptionRoute,
  subscriptionEditRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
