import SwiftUI

struct WatchHomeView: View {
    @StateObject var manager = WorkoutManager()
    
    // In a real app, this would be fetched from Supabase
    // Using dummy data for demonstration
    let templates: [TemplateStub] = [
        TemplateStub(id: "t1", name: "Push Day", exercises: 5),
        TemplateStub(id: "t2", name: "Leg Day", exercises: 4),
        TemplateStub(id: "t3", name: "Pull Day", exercises: 6)
    ]
    
    var body: some View {
        NavigationStack {
            if manager.activeSession != nil {
                WorkoutSessionView(manager: manager)
            } else {
                List(templates) { template in
                    Button(action: {
                        // Demo start
                        startTemplate(template)
                    }) {
                        VStack(alignment: .leading) {
                            Text(template.name)
                                .font(.headline)
                            Text("\(template.exercises) exercises")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .navigationTitle("Workout")
            }
        }
    }
    
    struct TemplateStub: Identifiable {
        let id: String
        let name: String
        let exercises: Int
    }
    
    private func startTemplate(_ template: TemplateStub) {
        // Mock data creation
        let mockExercises = [
            ExerciseLog(id: "e1", name: "Bench Press", sets: [
                SetLog(reps: 8, weight: 135),
                SetLog(reps: 8, weight: 135)
            ])
        ]
        manager.startWorkout(templateName: template.name, exercises: mockExercises)
    }
}
