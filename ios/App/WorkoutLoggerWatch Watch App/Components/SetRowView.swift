import SwiftUI

struct SetRowView: View {
    let set: SetLog
    let index: Int
    var onToggle: () -> Void
    
    var body: some View {
        Button(action: onToggle) {
            HStack {
                VStack(alignment: .leading) {
                    Text("SET \(index + 1)")
                        .font(.system(.caption2, design: .rounded))
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                    
                    Text("\(Int(set.weight)) lb × \(set.reps)")
                        .font(.system(.body, design: .rounded))
                        .fontWeight(.medium)
                }
                
                Spacer()
                
                ZStack {
                    Circle()
                        .stroke(set.done ? Color.green : Color.gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 28, height: 28)
                    
                    if set.done {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.system(size: 28))
                    }
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(set.done ? Color.green.opacity(0.1) : Color.white.opacity(0.05))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// Preview
struct SetRowView_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            SetRowView(set: SetLog(reps: 10, weight: 135), index: 0, onToggle: {})
            SetRowView(set: SetLog(reps: 10, weight: 135, done: true), index: 1, onToggle: {})
        }
    }
}
