import SwiftUI

struct WorkoutSessionView: View {
    @ObservedObject var manager: WorkoutManager
    @State private var selection: Int = 0
    
    var body: some View {
        if let session = manager.activeSession {
            TabView(selection: $selection) {
                // Summary/Health View
                VStack(spacing: 12) {
                    ProgressRing(progress: completionPercentage)
                        .frame(width: 80, height: 80)
                    
                    HStack(spacing: 20) {
                        VStack {
                            Text("\(manager.heartRate)")
                                .font(.system(.title2, design: .rounded))
                                .fontWeight(.bold)
                            Text("BPM")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        VStack {
                            Text("\(manager.calories)")
                                .font(.system(.title2, design: .rounded))
                                .fontWeight(.bold)
                            Text("KCAL")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .tag(-1)
                
                // Exercise Views
                ForEach(Array(session.exercises.enumerated()), id: \.offset) { index, exercise in
                    ExerciseView(exercise: exercise) { setIndex in
                        manager.toggleSet(exerciseId: exercise.id, setIndex: setIndex)
                    }
                    .tag(index)
                }
                
                // Finish View
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.green)
                    
                    Text("Session Complete?")
                        .font(.headline)
                    
                    Button("Finish Workout") {
                        manager.finishWorkout()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                }
                .tag(session.exercises.count)
            }
            .tabViewStyle(.page)
        }
    }
    
    private var completionPercentage: Double {
        guard let session = manager.activeSession else { return 0 }
        let totalSets = session.exercises.reduce(0) { $0 + $1.sets.count }
        let doneSets = session.exercises.reduce(0) { $0 + $1.sets.filter { $0.done }.count }
        return totalSets > 0 ? Double(doneSets) / Double(totalSets) : 0
    }
}
