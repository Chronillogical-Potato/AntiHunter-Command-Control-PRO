import { QueryClient, QueryClientProvider as ReactQueryProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export const QueryClientProvider = ({ children }: PropsWithChildren) => (
  <ReactQueryProvider client={queryClient}>{children}</ReactQueryProvider>
);

export { queryClient };
