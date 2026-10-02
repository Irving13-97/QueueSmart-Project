import { Link } from "react-router-dom";
import '../App.css';

export default function QueueManagement(){
    return(
        <div>
            <h1>Queue Management</h1>
            <p>Management customers waiting on Queue</p>

            <Link to="/admin-dashboard">Back to Admin Dashboard</Link>
        </div>
    );
}