namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addOnlineUsersTable1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.OnlineUsers", "Id_UserId", c => c.String());
            DropColumn("dbo.OnlineUsers", "UserId");
        }
        
        public override void Down()
        {
            AddColumn("dbo.OnlineUsers", "UserId", c => c.Int(nullable: false));
            DropColumn("dbo.OnlineUsers", "Id_UserId");
        }
    }
}
