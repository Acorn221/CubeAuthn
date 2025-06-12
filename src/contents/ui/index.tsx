import { PortClientProvider } from "@/contents-helpers/port-messaging/hooks";
import Dialog from "@/contents-helpers/dialog";

const Root = () => {
  return (
    <PortClientProvider timeout={ 1000 * 60 * 15 }>
      <Dialog />
    </PortClientProvider>
  )
};

export default Root;
