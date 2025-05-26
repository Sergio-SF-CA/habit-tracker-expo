import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Button, Switch, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get("window").width;

const defaultSections = {
  "Утренний блок": [
    { id: 1, title: "Вода + 10 отжиманий", done: false },
    { id: 2, title: "Медитация 10 мин", done: false },
    { id: 3, title: "Английский 10 мин", done: false },
  ],
  "Развитие бизнеса": [
    { id: 4, title: "1 час на развитие бизнеса", done: false },
  ],
  "Тренировка": [
    { id: 5, title: "Тренировка", done: false },
  ],
  "Без сериалов/фильмов": [
    { id: 6, title: "Без сериалов/фильмов", done: false },
  ],
};

export default function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [newHabits, setNewHabits] = useState({});
  const [newSectionName, setNewSectionName] = useState("");
  const [habitHistory, setHabitHistory] = useState({});
  const [habitSections, setHabitSections] = useState(defaultSections);

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Загрузка истории при запуске
  useEffect(() => {
    AsyncStorage.getItem('habitHistory').then(data => {
      if (data) {
        setHabitHistory(JSON.parse(data));
      }
    });
  }, []);

  // Загрузка состояния секций и заметок для выбранной даты
  useEffect(() => {
    if (habitHistory[date]) {
      setHabitSections(habitHistory[date].sections);
      setNotes(habitHistory[date].notes);
    } else {
      setHabitSections(defaultSections);
      setNotes("");
    }
  }, [date, habitHistory]);

  // Сохранение истории при изменении секций или заметки
  useEffect(() => {
    const newHistory = {
      ...habitHistory,
      [date]: {
        sections: habitSections,
        notes,
      }
    };
    setHabitHistory(newHistory);
    AsyncStorage.setItem("habitHistory", JSON.stringify(newHistory));
  }, [habitSections, notes, date]);

  // Обработчики привычек и блоков
  const toggleHabit = (section, id) => {
    setHabitSections(prev => ({
      ...prev,
      [section]: prev[section].map(h => h.id === id ? { ...h, done: !h.done } : h)
    }));
  };

  const handleAddHabit = (section) => {
    const newTitle = (newHabits[section] || "").trim();
    if (!newTitle) return;
    const newId = Math.max(0, ...Object.values(habitSections).flat().map(h => h.id)) + 1;
    const newHabit = { id: newId, title: newTitle, done: false };
    setHabitSections(prev => ({
      ...prev,
      [section]: [...prev[section], newHabit]
    }));
    setNewHabits(prev => ({ ...prev, [section]: "" }));
  };

  const handleDeleteHabit = (section, id) => {
    setHabitSections(prev => ({
      ...prev,
      [section]: prev[section].filter(h => h.id !== id)
    }));
  };

  const handleRenameSection = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    setHabitSections(prev => {
      const { [oldName]: habits, ...rest } = prev;
      return { ...rest, [newName]: habits };
    });
    setNewHabits(prev => {
      const { [oldName]: value, ...rest } = prev;
      return { ...rest, [newName]: value };
    });
  };

  const handleDeleteSection = (section) => {
    Alert.alert("Удалить блок?", `Точно удалить раздел "${section}"?`, [
      { text: "Отмена" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          setHabitSections(prev => {
            const { [section]: _, ...rest } = prev;
            return rest;
          });
          setNewHabits(prev => {
            const { [section]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    ]);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    setHabitSections(prev => ({ ...prev, [newSectionName]: [] }));
    setNewSectionName("");
  };

  const resetDay = () => {
    setHabitSections(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([section, habits]) => [
          section,
          habits.map(h => ({ ...h, done: false })),
        ])
      )
    );
    setNotes("");
  };

  const calculateProgress = () => {
    const allHabits = Object.values(habitSections).flat();
    const doneHabits = allHabits.filter(h => h.done).length;
    return allHabits.length > 0 ? Math.round((doneHabits / allHabits.length) * 100) : 0;
  };

  // История с фильтрацией
  const filteredHistory = Object.entries(habitHistory).filter(([historyDate]) => {
    if (filterStartDate && historyDate < filterStartDate) return false;
    if (filterEndDate && historyDate > filterEndDate) return false;
    return true;
  }).sort();

  const chartLabels = filteredHistory.map(([historyDate]) => historyDate);
  const chartData = filteredHistory.map(([_, data]) => {
    const total = Object.values(data.sections || {}).flat().length;
    const done = Object.values(data.sections || {}).flat().filter(h => h.done).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });

  // --- UI -----
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.header}>Трекер привычек</Text>

        {/* История и график */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>История:</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <TextInput style={styles.inputSmall} placeholder="От" value={filterStartDate} onChangeText={setFilterStartDate} />
            <TextInput style={styles.inputSmall} placeholder="До" value={filterEndDate} onChangeText={setFilterEndDate} />
          </View>
          {chartLabels.length > 1 && (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: chartData }]
              }}
              width={screenWidth - 40}
              height={180}
              yAxisSuffix="%"
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#f5f5f5",
                backgroundGradientTo: "#e0e0e0",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#3b82f6" }
              }}
              bezier
              style={{ borderRadius: 12, marginBottom: 8 }}
            />
          )}
          {filteredHistory.map(([d, data]) => {
            const total = Object.values(data.sections || {}).flat().length;
            const done = Object.values(data.sections || {}).flat().filter(h => h.done).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Text key={d} style={{ fontSize: 13 }}>
                {d}: {percent}% выполнено
              </Text>
            );
          })}
        </View>

        {/* Прогресс дня */}
        <Text style={{ textAlign: 'center', fontSize: 16, marginVertical: 8 }}>
          Прогресс дня: {calculateProgress()}%
        </Text>

        {/* Дата выбора */}
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="ГГГГ-ММ-ДД" />

        {/* Секции и привычки */}
        {Object.entries(habitSections).map(([section, habits]) => (
          <View key={section} style={styles.sectionBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <TextInput
                style={styles.sectionHeader}
                value={section}
                onChangeText={newName => handleRenameSection(section, newName)}
              />
              <TouchableOpacity onPress={() => handleDeleteSection(section)}>
                <Text style={{ color: 'red', fontSize: 30, marginLeft: 6 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {habits.map(habit => (
              <View key={habit.id} style={styles.habitRow}>
                <TextInput
                  style={styles.input}
                  value={habit.title}
                  onChangeText={text =>
                    setHabitSections(prev => ({
                      ...prev,
                      [section]: prev[section].map(h =>
                        h.id === habit.id ? { ...h, title: text } : h
                      )
                    }))
                  }
                />
                <Switch value={habit.done} onValueChange={() => toggleHabit(section, habit.id)} />
                <TouchableOpacity onPress={() => handleDeleteHabit(section, habit.id)}>
                  <Text style={{ color: 'red', fontSize: 24, marginLeft: 4 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {section !== "Без сериалов/фильмов" && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Новая привычка"
                  value={newHabits[section] || ""}
                  onChangeText={text => setNewHabits(prev => ({ ...prev, [section]: text }))}
                />
                <Button title="Добавить" onPress={() => handleAddHabit(section)} />
              </View>
            )}
          </View>
        ))}

        {/* Добавить блок */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <TextInput
            style={styles.input}
            placeholder="Название нового блока"
            value={newSectionName}
            onChangeText={setNewSectionName}
          />
          <Button title="Добавить блок" onPress={handleAddSection} />
        </View>

        {/* Заметки */}
        <Text style={{ marginTop: 16, fontSize: 14 }}>Что улучшить завтра?</Text>
        <TextInput
          style={styles.notes}
          value={notes}
          onChangeText={setNotes}
          placeholder="Твои мысли..."
          multiline
        />

        {/* Сбросить день */}
        <Button title="Сбросить день" color="#FF9800" onPress={resetDay} />
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, fontWeight: 'bold', marginVertical: 12, textAlign: 'center' },
  section: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 10, marginBottom: 12 },
  sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginVertical: 4, flex: 1, backgroundColor: '#fff' },
  inputSmall: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 6, marginRight: 8, width: 90, backgroundColor: '#fff' },
  sectionBlock: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, padding: 8, shadowColor: '#ccc', shadowOpacity: 0.2, shadowRadius: 5 },
  sectionHeader: { fontSize: 26, fontWeight: 'bold', flex: 1, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 4, backgroundColor: '#fff', borderRadius: 8, padding: 6 },
  habitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notes: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, minHeight: 60, backgroundColor: '#fff', marginBottom: 12 }
});
