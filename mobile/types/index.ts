export type TransactionType = 'income' | 'expense';

export type Transaction = {
  uuid: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  installment_total: number | null;
  installment_number: number | null;
  installment_group: string | null;
  subscription_uuid: string | null;
};

export type TransactionFormData = {
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  installments?: number | null;
};

export type SubscriptionInterval = 'monthly' | 'yearly';
export type SubscriptionCurrency = 'CLP' | 'USD';

export type Subscription = {
  uuid: string;
  name: string;
  service_key: string | null;
  amount: number;
  currency: SubscriptionCurrency;
  interval: SubscriptionInterval;
  billing_day: number;
  start_date: string;
  is_active: boolean;
  description: string | null;
  last_charged_date: string | null;
};

export type SubscriptionFormData = {
  name: string;
  service_key: string | null;
  amount: number;
  currency: SubscriptionCurrency;
  interval: SubscriptionInterval;
  billing_day: number;
  start_date: string;
  description: string | null;
};

export type DrawerParamList = {
  Dashboard: undefined;
  Transaction: { transaction?: Transaction } | undefined;
  History: undefined;
  Subscriptions: undefined;
  AddSubscription: { subscription?: Subscription } | undefined;
};
