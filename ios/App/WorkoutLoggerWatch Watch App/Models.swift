import Foundation

struct WorkoutLog: Identifiable, Codable {
    let id: String
    let template_name: String
    let date: String
    let duration: Int
    let exercises: [ExerciseLog]
}

struct ExerciseLog: Identifiable, Codable {
    let id: String
    let name: String
    var sets: [SetLog]
}

struct SetLog: Codable, Identifiable {
    var id: UUID = UUID()
    let reps: Int
    let weight: Double
    var done: Bool = false
    var actualReps: Int?
    var actualWeight: Double?
    var notes: String?
    
    enum CodingKeys: String, CodingKey {
        case reps, weight, done, actualReps, actualWeight, notes
    }
}

// Active Workout State (Transient)
struct ActiveWorkoutSession: Identifiable, Codable {
    var id: String
    var template_name: String
    var startTime: Double
    var exercises: [ExerciseLog]
}
