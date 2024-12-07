import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import LoadingScreen from '../components/LoadingScreen';
import CommentSection from '../components/CommentSection';
import FavoriteButton from '../components/FavoriteButton';
import StarRating from '../components/StarRating';
import { AuthContext } from '../context/AuthContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AlbumDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const scrollY = new Animated.Value(0);
  const { axiosInstance, user } = useContext(AuthContext);

  const { album } = route.params;

  const [albumData, setAlbumData] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingAlbumImage, setLoadingAlbumImage] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Estados para calificaciones
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const [newComment, setNewComment] = useState('');

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp'
  });

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const response = await axiosInstance.get(`/album_details`, {
          params: {
            album_id: album.id,
            cacheBust: new Date().getTime()
          },
        });

        console.log('Respuesta del backend:', response.data); 

        setAlbumData(response.data.album);
        setAverageRating(response.data.album.averageRating || 0);
        setRatingCount(response.data.album.ratingCount || 0);
      } catch (error) {
        console.error("Error al cargar los datos del álbum:", error);
        Alert.alert("Error", "Hubo un problema al cargar los datos del álbum. Por favor, intenta nuevamente.");
      }
    };

    fetchAlbumData();
  }, [album, axiosInstance]);

  useEffect(() => {
    const checkIfFavorite = async () => {
      try {
        const response = await axiosInstance.get('/get_favorites');
        const favorites = response.data.favorites;
        const isFav = favorites.some(
          (fav) => fav.entityId === album.id && fav.entityType === 'album'
        );
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Error al verificar si es favorito:', error);
      }
    };

    if (albumData) {
      checkIfFavorite();
    }
  }, [albumData, axiosInstance, album.id]);

  useEffect(() => {
    const fetchUserRating = async () => {
      try {
        const response = await axiosInstance.get('/get_user_rating', {
          params: {
            entityType: 'album',
            entityId: album.id,
          },
        });

        if (response.data.rating) {
          setUserRating(response.data.rating);
        }
      } catch (error) {
        console.error('Error al obtener la calificación del usuario:', error);
      }
    };

    if (albumData) {
      fetchUserRating();
    }
  }, [albumData, axiosInstance, album.id]);

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        // Eliminar de favoritos
        await axiosInstance.post('/remove_favorite', {
          entityType: 'album',
          entityId: album.id,
        });
      } else {
        // Agregar a favoritos
        await axiosInstance.post('/add_favorite', {
          entityType: 'album',
          entityId: album.id,
          name: albumData.name,
          image: albumData.cover_image,
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
      Alert.alert('Error', 'Hubo un problema al actualizar los favoritos.');
    }
  };

  const formatDuration = (durationMs) => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleRatingChange = async (rating) => {
    if (!user) {
      Alert.alert('Autenticación requerida', 'Debes iniciar sesión para calificar.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Acción no permitida', 'No puedes eliminar tu calificación una vez realizada.');
      return;
    }

    try {
      const response = await axiosInstance.post('/rate_entity', {
        entityType: 'album',
        entityId: album.id,
        rating: rating,
      });

      Alert.alert('Éxito', 'Tu calificación ha sido registrada.');

      // Actualizar el promedio y el conteo de calificaciones
      setAverageRating(response.data.averageRating);
      setRatingCount(response.data.ratingCount);
      setUserRating(rating);
    } catch (error) {
      if (error.response && error.response.data.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        console.error('Error al calificar:', error);
        Alert.alert('Error', 'No se pudo registrar tu calificación.');
      }
    }
  };

  // Función para publicar un nuevo comentario
  const handlePostComment = async () => {
    if (newComment.trim().length === 0) {
      Alert.alert("Error", "El comentario no puede estar vacío.");
      return;
    }

    try {
      if (!axiosInstance) {
        throw new Error("axiosInstance no está definido en el contexto.");
      }

      const response = await axiosInstance.post(`/album/${album.id}/comments`, {
        comment_text: newComment,
      });

      console.log("Comentario agregado:", response.data.comment);

      const updatedComments = sortComments([response.data.comment, ...comments]);
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error("Error al agregar el comentario:", error.message);
      Alert.alert("Error", "No se pudo agregar el comentario. Verifica la conexión.");
    }
  };

  const sortComments = (commentsList) => {
    return [...commentsList].sort((a, b) => b.likes - a.likes);
  };

  if (!albumData) {
    return <LoadingScreen />;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.keyboardAwareContainer}
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps='handled'
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Fondo difuminado con la imagen del álbum */}
          <View style={styles.backgroundGlow}>
            {loadingAlbumImage && (
              <ActivityIndicator size="large" color="#A071CA" style={styles.albumImageLoader} />
            )}
            <Image 
              source={{ uri: albumData.cover_image || 'https://via.placeholder.com/500' }}  
              style={styles.blurredBackground}
              blurRadius={50}
              onLoadStart={() => setLoadingAlbumImage(true)}
              onLoadEnd={() => setLoadingAlbumImage(false)}
            />
          </View>

          {/* Botón de cierre */}
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Icon name="times" size={30} color="#FFF" />
          </TouchableOpacity>

          {/* Imagen del álbum con efecto de escala */}
          <Animated.View style={[
            styles.albumImageContainer,
            { transform: [{ scale: imageScale }] }
          ]}>
            {loadingAlbumImage && (
              <ActivityIndicator size="large" color="#A071CA" style={styles.albumImageLoader} />
            )}
            <Image 
              source={{ uri: albumData.cover_image || 'https://via.placeholder.com/500' }}  
              style={styles.albumImage}
              onLoadStart={() => setLoadingAlbumImage(true)}
              onLoadEnd={() => setLoadingAlbumImage(false)}
            />
          </Animated.View>

          <View style={styles.contentContainer}>
            {/* Detalles del álbum */}
            <View style={styles.headerContainer}>
              <Text style={styles.albumName}>{albumData.name}</Text>
              <FavoriteButton isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} />
            </View>
            <TouchableOpacity
              onPress={() => {
                if (albumData.artist_ids && albumData.artist_ids.length > 0) {
                  navigation.navigate('ArtistDetailsScreen', {
                    artistId: albumData.artist_ids[0],
                    artistName: albumData.artists[0],
                  });
                } else {
                  console.warn('No se encontró artist_ids en albumData');
                  Alert.alert('Error', 'No se pudo obtener la información del artista.');
                }
              }}
            >
              <Text style={styles.albumArtists}>by {albumData.artists.join(', ')}</Text>
            </TouchableOpacity>
            <Text style={styles.albumReleaseDate}>Released on {albumData.release_date}</Text>

            {/* Sección de calificaciones */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Califica este álbum</Text>
              <StarRating 
                maxStars={10} 
                currentRating={userRating} 
                onRatingChange={handleRatingChange} 
                editable={userRating === 0}
              />
              <Text style={styles.averageRatingText}>
                Promedio de calificaciones: {averageRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'calificación' : 'calificaciones'})
              </Text>
            </View>

            {/* Lista de canciones */}
            <Text style={styles.tracksTitle}>Tracks</Text>
            <View style={styles.tracksContainer}>
              {albumData.tracks.map((track) => (
                <TouchableOpacity 
                  key={track.id} 
                  style={styles.trackItem}
                  onPress={() => {
                    navigation.navigate('SongDetailsScreen', { songId: track.id });
                  }}
                >
                  <Text style={styles.trackName}>{track.track_number}. {track.name}</Text>
                  <Text style={styles.trackDuration}>{formatDuration(track.duration_ms)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sección de comentarios */}
            <CommentSection
              entityType="album"
              entityId={albumData.id}
              comments={comments}
              onAddComment={setComments}
              navigation={navigation}
            />

            {/* Campo de entrada para comentarios */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un comentario..."
                placeholderTextColor="#888"
                value={newComment}
                onChangeText={setNewComment}
                multiline={true}
                numberOfLines={3}
              />
              <TouchableOpacity style={styles.postButton} onPress={handlePostComment}>
                <Text style={styles.postButtonText}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  keyboardAwareContainer: {
    flex: 1,
    backgroundColor: '#171515',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 0, 
    paddingVertical: 10,  
  },
  innerContainer: {
    flex: 1,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blurredBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  albumImageLoader: { 
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -25,
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  albumImageContainer: { 
    height: screenHeight * 0.5,
    width: '100%',
    marginTop: -50,
  },
  albumImage: { 
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    paddingHorizontal: 0, 
    paddingTop: 20,        
    backgroundColor: 'rgba(23, 21, 21, 0.9)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10, 
  },
  albumName: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 5,
    flex: 1,
    flexWrap: 'wrap',
  },
  albumArtists: {
    fontSize: 18,
    color: '#A071CA',
    marginBottom: 5,
  },
  albumReleaseDate: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 20,
  },
  ratingSection: {
    marginBottom: 20,
    paddingHorizontal: 10, 
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  averageRatingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  tracksTitle: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tracksContainer: {
    marginBottom: 20,
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomColor: '#555',
    borderBottomWidth: 0.5,
    width: '100%', 
  },
  trackName: {
    fontSize: 16,
    color: '#FFF',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 10,
  },
  trackDuration: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', 
    borderTopWidth: 1,
    borderColor: '#444',
    paddingTop: 10,          
    marginTop: 15,           
    paddingHorizontal: 10,  
    width: '100%',          
  },
  input: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    textAlignVertical: 'top', 
    maxHeight: 100, 
  },
  postButton: {
    backgroundColor: '#A071CA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: 'flex-end', 
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AlbumDetailsScreen;
