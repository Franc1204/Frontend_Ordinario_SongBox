import React, { createContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [authToken, setAuthToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [authCompleted, setAuthCompleted] = useState(false); 

  const backendBaseURL = 'https://songbox-ordinario.onrender.com'; 

  const navigation = useNavigation();

  // Memoizar axiosInstance para evitar recreaciones en cada render
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: backendBaseURL,
      timeout: 30000, // 10 segundos
    });

    // Interceptor para añadir el token JWT a cada solicitud
    instance.interceptors.request.use(
      async (config) => {
        if (authToken) {
          config.headers['Authorization'] = `Bearer ${authToken}`;
          console.log('Authorization Header Añadido:', `Bearer ${authToken}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, [authToken]);

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', {
        email,
        password,
      });
      const { jwt, user: userData } = response.data;

      await AsyncStorage.setItem('userToken', jwt);
      setAuthToken(jwt);
      setUser(userData);

      console.log('Token almacenado:', jwt);

      // Redirigir al flujo de autenticación de Spotify en el backend
      const authSpotifyUrl = `${backendBaseURL}/auth/spotify?state=${encodeURIComponent(userData.email)}`;
      await Linking.openURL(authSpotifyUrl);

      // La autenticación se completará cuando el backend redirija mediante el deep link
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  // Función para registrar un nuevo usuario
  const register = async (username, email, password) => {
    try {
      const response = await axiosInstance.post('/register', {
        username,
        email,
        password,
      });
      const { jwt, user: userData } = response.data;

      await AsyncStorage.setItem('userToken', jwt);
      setAuthToken(jwt);
      setUser(userData);

      console.log('Token almacenado:', jwt);

      // Redirigir al flujo de autenticación de Spotify en el backend
      const authSpotifyUrl = `${backendBaseURL}/auth/spotify?state=${encodeURIComponent(userData.email)}`;
      await Linking.openURL(authSpotifyUrl);

      // La autenticación se completará cuando el backend redirija mediante el deep link
    } catch (error) {
      console.error('Error en register:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al registrar usuario');
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      setUser(null);
      setAuthToken(null);
      await AsyncStorage.removeItem('userToken');
      console.log('Usuario cerró sesión y token eliminado.');
    } catch (error) {
      console.error('Error en logout:', error);
      Alert.alert('Error', 'Ocurrió un error al cerrar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar el token almacenado al iniciar la app
  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');

        if (!storedToken) {
          console.log('No hay token almacenado. El usuario no ha iniciado sesión.');
          setIsLoading(false);
          return;
        }

        console.log('Token almacenado encontrado:', storedToken);
        setAuthToken(storedToken);

        try {
          const response = await axiosInstance.get('/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(response.data.user);
          console.log('Usuario autenticado:', response.data.user);
          setAuthCompleted(true); // Indicar que la autenticación se completó
        } catch (error) {
          console.error('Token inválido, cerrando sesión...');
          await logout();
        }
      } catch (error) {
        console.error('Error al cargar el token almacenado:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredToken();
  }, [axiosInstance]);

  // Manejar el deep link de redirección desde el backend
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log("Deep link recibido:", url);
  
      // Extraer el token del deep link
      const token = extractTokenFromUrl(url);
      if (token) {
        console.log("Token recibido desde deep link:", token);
        await AsyncStorage.setItem('userToken', token);
        setAuthToken(token);
  
        try {
          const response = await axiosInstance.get('/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data.user);
          console.log('Usuario autenticado:', response.data.user);
          setAuthCompleted(true);
  
          // Redirigir al HomeScreen
          navigation.reset({
            index: 0,
            routes: [{ name: 'HomeScreen' }],
          });
        } catch (error) {
          console.error('Token inválido, cerrando sesión...');
          await logout();
        }
      }
    };
  
    // Suscribirse al evento de deep linking
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
  
    // Verificar si la aplicación se abrió con un enlace
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
  
    // Limpiar la suscripción al desmontar el componente
    return () => {
      linkingSubscription.remove();
    };
  }, [navigation, axiosInstance]);
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
        axiosInstance,
        setUser,
        authCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Función para extraer el token del URL
const extractTokenFromUrl = (url) => {
  const regex = /token=([^&]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};
