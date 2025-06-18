import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SleepQualityChart: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sleep Quality Chart Placeholder</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backgroundColor: '#f9f9f9',
  },
  text: {
    fontSize: 16,
    color: '#555',
  },
});

export default SleepQualityChart;
