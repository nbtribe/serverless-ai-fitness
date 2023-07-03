const { unmarshall } = require('@aws-sdk/util-dynamodb');

exports.handler = async (state) => {
  let user = state.user;
  if (state.unmarshall) {
    user = unmarshall(user);
  }

  const days = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  const workouts = [];
  const muscleGroups = shuffleArray(user.muscleGroups);
  const currentDate = new Date();

  for (let i = 0; i < 7; i++) {
    const day = days[i];
    if (user.frequency.includes(day)) {
      const workout = createWorkoutPrompt(day, user.equipment, user.experienceLevel, user.objective, user.workoutTypes, muscleGroups.pop(), user.targetTime, user.specialWorkouts);
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      workout.date = date.toISOString();
      workouts.push(workout);
    }
  }

  return workouts.map(w => formatWorkout(w));
};

const createWorkoutPrompt = (day, equipment, experienceLevel, objective, workoutTypes, muscleGroup, targetTime, specialWorkouts) => {
  const workout = {
    day,
    muscleGroup,
    experienceLevel,
    targetTime,
    objective,
    equipment: getEquipment(equipment),
    workoutType: workoutTypes[Math.floor(Math.random() * workoutTypes.length)]
  };

  const isSpecialDay = isSpecialWorkoutDay(specialWorkouts, day);
  if (isSpecialDay && Math.random() <= specialWorkouts.percentChance / 100) {
    workout.equipment = [specialWorkouts.equipment[Math.floor(Math.random() * specialWorkouts.equipment.length)]];
    workout.objective = specialWorkouts.objective;
    delete workout.workoutType;
    workout.muscleGroup = 'special workout';
  }

  workout.prompt = `Create a ${workout.workoutType?.type || ''} workout ${workout.workoutType?.modifier || ''} for ` +
    `${workout.objective} ${workout.workoutType ? 'targeting the ' + workout.muscleGroup : ''} using ${workout.equipment.join(', ')}.` +
    ` It should be a ${workout.experienceLevel}-level workout that takes around ${workout.targetTime} minutes to complete the main set. ` +
    `Also create a dynamic warmup with 6 or more related exercises for this workout and an ab set for afterward.`;

  return workout;
};

const isSpecialWorkoutDay = (specialWorkouts, day) => specialWorkouts.days.find(d => d == day);

const getEquipment = (equipment) => {
  if (equipment.length === 0) {
    return [];
  }

  const selectedEquipment = [];
  const shuffledEquipment = [...equipment].sort(() => 0.5 - Math.random());
  const numberOfEquipment = Math.floor(Math.random() * 3) + 1;

  while (selectedEquipment.length < numberOfEquipment && shuffledEquipment.length > 0) {
    const randomNumber = Math.random();
    const equipmentIndex = shuffledEquipment.findIndex(item => randomNumber <= item.threshold);

    if (equipmentIndex !== -1) {
      const equipment = shuffledEquipment[equipmentIndex];
      selectedEquipment.push(equipment);
      shuffledEquipment.splice(equipmentIndex, 1);
    }
  }

  return selectedEquipment.map(item => item.type);
};

const shuffleArray = array => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const formatWorkout = (workout) => {
  return {
    date: workout.date.split('T')[0],
    muscleGroup: workout.muscleGroup,
    equipment: workout.equipment.join(', '),
    workoutType: workout.workoutType?.type || 'special workout',
    prompt: workout.prompt
  };
};