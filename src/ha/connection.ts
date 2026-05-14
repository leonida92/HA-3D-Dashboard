import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  Connection,
} from 'home-assistant-js-websocket';
import type { HassEntities } from 'home-assistant-js-websocket';
import { useStore } from '../store/useStore';

let connection: Connection | null = null;

export const connectHA = async () => {
  const { haUrl, haToken, setConnectionState, setEntities } = useStore.getState();

  if (!haUrl || !haToken) {
    setConnectionState('disconnected');
    return;
  }

  setConnectionState('connecting');

  try {
    const auth = createLongLivedTokenAuth(haUrl, haToken);
    connection = await createConnection({ auth });

    setConnectionState('connected');

    subscribeEntities(connection, (entities: HassEntities) => {
      setEntities(entities);
    });

    connection.addEventListener('disconnected', () => {
      setConnectionState('disconnected');
    });

    connection.addEventListener('ready', () => {
      setConnectionState('connected');
    });
  } catch (err) {
    console.error('HA Connection Error', err);
    setConnectionState('error');
  }
};

export const callService = async (
  domain: string,
  service: string,
  serviceData?: Record<string, any>
) => {
  if (!connection) return;
  try {
    await connection.sendMessagePromise({
      type: 'call_service',
      domain,
      service,
      service_data: serviceData,
    });
  } catch (err) {
    console.error('Error calling service', err);
  }
};
