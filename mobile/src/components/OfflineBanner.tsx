import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, SafeAreaView } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [showRestored, setShowRestored] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    let wasOffline = false;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      
      if (offline) {
        wasOffline = true;
        setIsConnected(false);
        setShowRestored(false);
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        setIsConnected(true);
        if (wasOffline) {
          setShowRestored(true);
          Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          // Ocultar banner de reconexión tras 3.5 segundos
          setTimeout(() => {
            Animated.timing(animation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setShowRestored(false);
              wasOffline = false;
            });
          }, 3500);
        } else {
          Animated.timing(animation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (isConnected && !showRestored) {
    return null;
  }

  const isOffline = !isConnected;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.restoredBanner,
        {
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
          opacity: animation,
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <MaterialCommunityIcons
            name={isOffline ? 'wifi-off' : 'wifi-check'}
            size={18}
            color="#ffffff"
          />
          <Text style={styles.text}>
            {isOffline
              ? 'Sin conexión a internet — Modo fuera de línea'
              : 'Conexión a internet restablecida'}
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  offlineBanner: {
    backgroundColor: '#dc2626', // Rojo alerta
  },
  restoredBanner: {
    backgroundColor: '#16a34a', // Verde éxito
  },
  safeArea: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
