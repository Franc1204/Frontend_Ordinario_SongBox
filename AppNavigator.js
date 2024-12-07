import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from './screens/WelcomeScreen';
import Welcome2 from './screens/Welcome2';
import RegisterScreen from './screens/RegisterScreen';
import SignInScreen from './screens/SignInScreen';
import HomeScreen from './screens/HomeScreen';
import AlbumDetailsScreen from './screens/AlbumDetailsScreen';
import ArtistDetailsScreen from './screens/ArtistDetailsScreen';
import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import SongDetailsScreen from './screens/SongDetailsScreen';
import { AuthContext } from './context/AuthContext';
import UserDetailsScreen from './screens/UserDetailsScreen'

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user } = useContext(AuthContext);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="AlbumDetailsScreen" component={AlbumDetailsScreen} />
          <Stack.Screen name="ArtistDetailsScreen" component={ArtistDetailsScreen} />
          <Stack.Screen name="SearchScreen" component={SearchScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="SongDetailsScreen" component={SongDetailsScreen} />
          <Stack.Screen name="UserDetailsScreen" component={UserDetailsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Welcome2" component={Welcome2} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="SignInScreen" component={SignInScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
