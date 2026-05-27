import SwiftUI

struct ExerciseView: View {
    let exercise: ExerciseLog
    var onToggleSet: (Int) -> Void
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(exercise.name.uppercased())
                    .font(.system(.caption, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundColor(.blue)
                    .padding(.top, 5)
                
                ForEach(Array(exercise.sets.enumerated()), id: \.offset) { index, set in
                    SetRowView(set: set, index: index) {
                        onToggleSet(index)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}
