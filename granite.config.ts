import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  scheme: 'intoss',
  appName: 'gibukim',
  plugins: [
    appsInToss({
      brand: {
        displayName: '하루기부',
        primaryColor: '#FF7F6E',
        icon: 'https://static.toss.im/appsintoss/20887/598b5bd6-340d-4c1b-bbb6-54861fbb8041.png',
      },
      permissions: [],
    }),
  ],
});
